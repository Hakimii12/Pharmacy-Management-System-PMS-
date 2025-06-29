import mongoose from "mongoose";
import Product from "../models/productModel.js";
import Sales from "../models/SalesModel.js"
import User from "../models/UserModel.js"
import DailyBalance from "../models/DailyBalance.js";
export const prepareSale = async (items, pharmacistId) => {
  const preparedItems = [];
  let grandTotal = 0;
  
  for (const item of items) {
    const product = await Product.findById(item.productId);
    
    if (!product) throw new Error(`Product not found: ${item.productId}`);
    if (product.quantity < item.quantity) {
      throw new Error(`Insufficient stock for ${product.name}. Available: ${product.quantity}`);
    }
    if (product.expiryDate < new Date()) {
      throw new Error(`Product expired: ${product.name} (Batch: ${product.batchNo})`);
    }

    const saleAmount = product.sellingPrice * item.quantity;
    const profit = (product.sellingPrice - product.unitPrice) * item.quantity;
    
    preparedItems.push({
      productId: product._id,
      quantity: item.quantity,
      name:product.name,
      brand:product.brand,
      saleAmount,
      profit
    });
    
    grandTotal += saleAmount;
  }
  return {
    transactionId: new mongoose.Types.ObjectId().toString(),
    items: preparedItems,
    grandTotal,
    pharmacistId,
    timestamp: new Date()
  };
};
export const savePreparedSale = async (preparedSale) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const salesRecords = [];
    
    for (const item of preparedSale.items) {
      const saleRecord = new Sales({
        transactionId: preparedSale.transactionId,
        product: item.productId,
        name:item.name,
        brand:item.brand,
        quantitySold: item.quantity,
        profit: item.profit,
        saleAmount: item.saleAmount,
        status: "pending",
        pharmacist: preparedSale.pharmacistId,
        timestamp: preparedSale.timestamp
      });
      
      await saleRecord.save({ session });
      salesRecords.push(saleRecord);
    }
    
    await session.commitTransaction();
    return {
      success: true,
      transactionId: preparedSale.transactionId,
      grandTotal: preparedSale.grandTotal,
      salesRecords
    };
  } catch (error) {
    await session.abortTransaction();
    throw new Error(`Failed to save sale: ${error.message}`);
  } finally {
    session.endSession();
  }
};
export const confirmSale = async (transactionId, cashierId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Find all pending sales records for this transaction
    const salesRecords = await Sales.find({ 
      transactionId, 
      status: "pending" 
    }).session(session);

    if (!salesRecords.length) {
      throw new Error("No pending transactions found");
    }

    // Process each item in the transaction
    for (const record of salesRecords) {
      // 1. Update product inventory
      const product = await Product.findByIdAndUpdate(
        record.product,
        { $inc: { quantity: -record.quantitySold } },
        { new: true, session }
      );
      
      // 2. Update product expiration status if needed
      if (product.quantity <= 0) {
        product.isExpired = (product.expiryDate < new Date());
        await product.save({ session });
      }
      
      // 3. Update sales record status
      record.status = "completed";
      record.cashier = cashierId;
      await record.save({ session });
    }
    
    await session.commitTransaction();
    return {
      success: true,
      transactionId,
      completedAt: new Date()
    };
  } catch (error) {
    await session.abortTransaction();
    
    // Mark transaction as aborted on failure
    await Sales.updateMany(
      { transactionId, status: "pending" },
      { $set: { status: "aborted" } }
    );
    
    throw new Error(`Sale confirmation failed: ${error.message}`);
  } finally {
    session.endSession();
  }
};
export const abortSale = async (transactionId) => {
  const result = await Sales.updateMany(
    { transactionId, status: "pending" },
    { $set: { status: "aborted" } }
  );
  
  if (result.nModified === 0) {
    throw new Error("No pending transactions found to abort");
  }
  
  return {
    success: true,
    transactionId,
    abortedAt: new Date()
  };
};
export const closeDailyBalance = async (cashierId, countedAmount) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Get all completed transactions for today
  const transactions = await Sales.find({
    status: "completed",
    cashier: cashierId,
    timestamp: { $gte: today, $lt: tomorrow }
  });
  
  // Calculate expected amount
  const expectedAmount = transactions.reduce(
    (sum, transaction) => sum + transaction.saleAmount, 
    0
  );
  
  // Create daily balance record
  const dailyBalance = new DailyBalance({
    date: today,
    expectedAmount,
    countedAmount,
    status: countedAmount === expectedAmount ? "verified" : "discrepancy",
    transactions: transactions.map(t => t._id),
    cashier: cashierId,
    ...(countedAmount !== expectedAmount && {
      discrepancyNote: `Expected: ${expectedAmount}, Counted: ${countedAmount}`
    })
  });
  
  await dailyBalance.save();
  
  return {
    success: true,
    dailyBalance,
    transactionCount: transactions.length
  };
};