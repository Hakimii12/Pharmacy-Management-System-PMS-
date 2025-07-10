import mongoose from "mongoose";
import Product from "../models/ProductModel.js";
import Sales from "../models/SalesModel.js"
import User from "../models/UserModel.js"
import DailyBalance from "../models/DailyBalance.js";
import { updateProfitSummary } from "../utils/profitUtils.js";
import Notification from "../models/NotificationModel.js";
export const PrepareAndSaveSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const pharmacistId=req.user._id
    const { items,patientName } = req.body;
    const preparedItems = [];
    let grandTotal = 0;
    const transactionId = new mongoose.Types.ObjectId().toString();
    const timestamp = new Date();

    // Validate and prepare items
    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }
      if (product.inventory.dispensary < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.inventory.dispensary}`);
      }
      if (product.expiryDate < new Date()) {
        throw new Error(`Product expired: ${product.name} (Batch: ${product.batchNo})`);
      }

      const saleAmount = product.sellingPrice * item.quantity;
      const profit = (product.sellingPrice - product.unitPrice) * item.quantity;
      
      preparedItems.push({
        productId: product._id,
        name: product.name,
        brand: product.brand,
        quantity: item.quantity,
        saleAmount,
        profit
      });
      
      grandTotal += saleAmount;
    }

    // Create sales records
    const salesRecords = [];
    for (const item of preparedItems) {
      const saleRecord = new Sales({
        transactionId,
        product: item.productId,
        name: item.name,
        patientName,
        brand: item.brand,
        quantitySold: item.quantity,
        profit: item.profit,
        saleAmount: item.saleAmount,
        status: "pending",
        pharmacist: pharmacistId,
        timestamp
      });
      
      await saleRecord.save({ session });
      salesRecords.push(saleRecord);
    }
    await session.commitTransaction();
    
    res.status(201).json({
      success: true,
      transactionId,
      grandTotal,
      items: preparedItems,
      salesRecords
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// Cashier: Confirm sale (after payment)
export const ConfirmSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { transactionId } = req.params;
    const cashierId = req.user.id; // Assuming authenticated user

    const salesRecords = await Sales.find({ 
      transactionId, 
      status: "pending" 
    }).session(session);

    if (!salesRecords.length) {
      throw new Error("No pending transactions found");
    }
    let currentProfit=0;
    for (const record of salesRecords) {
        const loc = 'dispensary';
        const product = await Product.findByIdAndUpdate(
          record.product,
          { $inc: {'inventory.dispensary': -record.quantitySold ,quantity:-record.quantitySold} },
          { new: true, session }
        );
        const quantity = product.inventory[loc];
        const threshold = product.inventory[`${loc}Threshold`];
      // Update expiration status if stock depleted
      if (product.quantity <= 0) {
        product.isExpired = (product.expiryDate < new Date());
        await product.save({ session });
      }
      // Update sales record
      record.status = "completed";
      record.cashier = cashierId;
      currentProfit +=record.profit
      await record.save({ session });
      if (quantity === 0 || quantity < threshold) {
    const type = quantity === 0 ? 'OutOfStock' : 'LowStock';
    const message = quantity === 0 
      ? `Product ${product.name} is out of stock in ${loc}.`
      : `Product ${product.name} is low in ${loc}. Current: ${quantity}, Threshold: ${threshold}.`;

    // Check for existing notification
    const existing = await Notification.findOne({
      product: product._id,
      location: loc,
      type,
      read: false
    }).session(session);

    if (!existing) {
      const notification = new Notification({
        type,
        message,
        product: product._id,
        location: loc,
        read: false
      });
      await notification.save({ session });
    }
  }
    }
    updateProfitSummary(currentProfit,new Date());
    await session.commitTransaction();
    
    res.json({
      success: true,
      transactionId,
      completedAt: new Date(),
      itemsCount: salesRecords.length
    });
  } catch (error) {
    await session.abortTransaction();
    
    // Mark as aborted on failure
    await Sales.updateMany(
      { transactionId: req.params.transactionId, status: "pending" },
      { $set: { status: "aborted" } }
    );
    
    res.status(400).json({
      success: false,
      error: `Sale failed: ${error.message}`
    });
  } finally {
    session.endSession();
  }
};
export const AbortSale = async (req,res) => {
  const { transactionId } = req.params;
  const result = await Sales.updateMany(
    { transactionId, status: "pending" },
    { $set: { status: "aborted" } }
  );
  
  if (result.nModified === 0) {
    throw new Error("No pending transactions found to abort");
  }
  return res.status(200).json({
      success: true,
      transactionId,
      abortedAt: new Date()
    });
};
export const CloseDailyBalance = async (req,res) => {
  const {cashierId, countedAmount}=req.body;
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
    status: countedAmount == expectedAmount ? "verified" : "discrepancy",
    transactions: transactions.map(t => t._id),
    cashier: cashierId,
    ...(countedAmount !== expectedAmount && {
      discrepancyNote: `Expected: ${expectedAmount}, Counted: ${countedAmount}`
    })
  });
  
  await dailyBalance.save();
  return res.status(200).json({
    success: true,
    dailyBalance,
    transactionCount: transactions.length
  });
};
export async function GetAllPendingStatus(req,res){
  try {
    const PendingTransaction = await Sales.find({status:"pending"}).populate('pharmacist', 'name email role')
    .populate('product','name brand batchNo sellingPrice category')
    const pendingOrders = transformSalesRecords(PendingTransaction);
    res.status(200).json(pendingOrders)
  } catch (error) {
    res.status(500).json({massage:error.message})
  }
}
