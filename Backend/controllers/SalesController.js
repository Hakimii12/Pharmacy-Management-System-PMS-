import mongoose from "mongoose"
import Product from "../models/ProductModel.js"
import Dispensary from "../models/DispensaryModel.js"
import Sales from "../models/SalesModel.js"
import DailyBalance from "../models/DailyBalance.js"
import { updateProfitSummary } from "../utils/profitUtils.js" // Assuming this utility exists
import Notification from "../models/NotificationModel.js"
import transformSalesRecords from "../utils/transformSalesRecords.js" // Assuming this utility exists
import User from "../models/UserModel.js"
import Transfare from "../models/Transfer.js"
export const PrepareAndSaveSale = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    const pharmacistId = req.user._id
    const { items, patientName } = req.body
    const preparedItems = []
    let grandTotal = 0
    const transactionId = new mongoose.Types.ObjectId().toString()
    const timestamp = new Date()

    // Validate and prepare items
    for (const item of items) {
      const product = await Product.findOne({
        _id: item.productId,
        isDeleted: { $ne: true },
      }).session(session)
      if (!product) {
        throw new Error(`Product not found or has been deleted: ${item.productId}`)
      }

      const dispensary = await Dispensary.findOne({
        product: item.productId,
        isDeleted: { $ne: true },
        isActive: true,
      }).session(session)
      if (!dispensary) {
        throw new Error(`Product ${product.name} is not available in dispensary`)
      }

      const dispensaryQty = dispensary.quantity
      if (dispensaryQty < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${dispensaryQty}`)
      }

      if (product.expiryDate < new Date()) {
        throw new Error(`Product expired: ${product.name} (Batch: ${product.batchNo})`)
      }

      const saleAmount = product.sellingPrice * item.quantity
      const profit = (product.sellingPrice - product.unitPrice) * item.quantity

      preparedItems.push({
        productId: product._id,
        name: product.name,
        brand: product.brand,
        quantity: item.quantity,
        saleAmount,
        profit,
        dosageForm: product.DosageForms, // Ensure dosageForm is included if needed for sales record
      })
      grandTotal += saleAmount
    }

    // Create sales records
    const salesRecords = []
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
        dosageForm: item.dosageForm,
        timestamp,
      })
      await saleRecord.save({ session })
      salesRecords.push(saleRecord)
    }

    await session.commitTransaction()
    res.status(201).json({
      success: true,
      transactionId,
      grandTotal,
      items: preparedItems,
      salesRecords,
    })
  } catch (error) {
    await session.abortTransaction()
    res.status(500).json({
      success: false,
      error: error.message,
    })
  } finally {
    session.endSession()
  }
}
export const CreateCreditSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const pharmacistId = req.user._id;
    const { 
      items, 
      patientName, 
      customerPhone, 
      customerAddress, 
      dueDate,
      amountPaid = 0 // For partial payments
    } = req.body;

    const preparedItems = [];
    let grandTotal = 0;
    const transactionId = new mongoose.Types.ObjectId().toString();
    const timestamp = new Date();

    // Use provided due date or set default to 30 days from now
    let calculatedDueDate = dueDate;
    if (!calculatedDueDate) {
      calculatedDueDate = new Date();
      calculatedDueDate.setDate(calculatedDueDate.getDate() + 30); // Default to 30 days
    }

    // Validate and prepare items
    for (const item of items) {
      const product = await Product.findOne({
        _id: item.productId,
        isDeleted: { $ne: true },
      }).session(session);
      
      if (!product) {
        throw new Error(`Product not found or has been deleted: ${item.productId}`);
      }

      const dispensary = await Dispensary.findOne({
        product: item.productId,
        isDeleted: { $ne: true },
        isActive: true,
      }).session(session);
      
      if (!dispensary) {
        throw new Error(`Product ${product.name} is not available in dispensary`);
      }

      const dispensaryQty = dispensary.quantity;
      if (dispensaryQty < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${dispensaryQty}`);
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
        profit,
        dosageForm: product.DosageForms,
        unitPrice: product.unitPrice,
        sellingPrice: product.sellingPrice
      });
      grandTotal += saleAmount;
    }

    // Validate partial payment
    if (amountPaid > grandTotal) {
      throw new Error("Amount paid cannot exceed total sale amount");
    }

    const remainingBalance = grandTotal - amountPaid;
    const paymentStatus = amountPaid > 0 ? 
      (amountPaid === grandTotal ? "paid" : "partial") : 
      "credit";

    // Create sales records and update stock
    const salesRecords = [];
    for (const item of preparedItems) {
      // Calculate item-wise amounts for partial payments
      const itemAmountPaid = amountPaid > 0 ? 
        (item.saleAmount / grandTotal) * amountPaid : 0;
      const itemRemainingBalance = item.saleAmount - itemAmountPaid;

      const saleRecord = new Sales({
        transactionId,
        product: item.productId,
        patientName,
        customerPhone,
        customerAddress,
        quantitySold: item.quantity,
        profit: item.profit,
        saleAmount: item.saleAmount,
        sellingPrice: item.sellingPrice,
        totalUnitPrice: item.unitPrice * item.quantity,
        status: "completed", // Credit sales are immediately completed
        saleType: "credit",
        paymentStatus: itemRemainingBalance > 0 ? 
          (itemAmountPaid > 0 ? "partial" : "credit") : "paid",
        amountPaid: itemAmountPaid,
        remainingBalance: itemRemainingBalance,
        dueDate: calculatedDueDate,
        creditApprovedBy: pharmacistId,
        creditApprovedAt: new Date(),
        paymentHistory: amountPaid > 0 ? [{
          amount: itemAmountPaid,
          paymentDate: new Date(),
          paymentMethod: "cash",
          receivedBy: pharmacistId,
          notes: "Initial partial payment"
        }] : [],
        pharmacist: pharmacistId,
        cashier: pharmacistId, // For credit sales, pharmacist acts as cashier
        completedAt: new Date(),
        timestamp
      });

      // Update stock (same as cash sale)
      await Dispensary.findOneAndUpdate(
        { product: item.productId },
        { $inc: { quantity: -item.quantity } },
        { new: true, session }
      );

      await Product.findByIdAndUpdate(
        item.productId, 
        { $inc: { quantity: -item.quantity } }, 
        { session }
      );

      await saleRecord.save({ session });
      salesRecords.push(saleRecord);

      // Check for expired product
      const product = await Product.findById(item.productId);
      if (product.expiryDate <= new Date()) {
        await Notification.create({
          type: "Expired",
          message: `Sold expired product: ${product.name}`,
          product: product._id,
          location: "dispensary",
          read: false,
        });
      }

      await Dispensary.updateStatus(item.productId, session);
    }

    // Update profit summary
    const totalProfit = preparedItems.reduce((sum, item) => sum + item.profit, 0);
    updateProfitSummary(totalProfit, new Date());

    await session.commitTransaction();
    
    res.status(201).json({
      success: true,
      transactionId,
      grandTotal,
      amountPaid,
      remainingBalance,
      paymentStatus,
      dueDate: calculatedDueDate,
      items: preparedItems,
      salesRecords,
      message: `Credit sale created successfully. ${amountPaid > 0 ? `Partial payment of ${amountPaid} received.` : 'No initial payment received.'}`
    });

  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({
      success: false,
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};
export const ProcessCreditPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { transactionId, paymentAmount, paymentMethod = "cash", notes } = req.body;
    const userId = req.user._id;

    if (!transactionId || !paymentAmount || paymentAmount <= 0) {
      throw new Error("Valid transaction ID and payment amount are required");
    }

    // Find all sales records for this transaction
    const salesRecords = await Sales.find({ 
      transactionId,
      saleType: "credit",
      paymentStatus: { $in: ["partial", "credit"] }
    }).session(session);

    if (salesRecords.length === 0) {
      throw new Error("No credit sales found for this transaction");
    }

    const totalRemainingBalance = salesRecords.reduce((sum, record) => sum + record.remainingBalance, 0);
    
    if (paymentAmount > totalRemainingBalance) {
      throw new Error(`Payment amount exceeds remaining balance. Maximum: ${totalRemainingBalance} ETB`);
    }

    // FIXED PAYMENT DISTRIBUTION LOGIC
    const paymentRecords = [];
    let remainingPayment = paymentAmount;
    
    // Calculate total remaining balance for proportional distribution
    const totalBalance = salesRecords.reduce((sum, record) => sum + record.remainingBalance, 0);
    
    for (let i = 0; i < salesRecords.length && remainingPayment > 0; i++) {
      const record = salesRecords[i];
      
      // Calculate proportional payment for this record
      const recordProportion = record.remainingBalance / totalBalance;
      let paymentForThisRecord = paymentAmount * recordProportion;
      
      // Ensure we don't pay more than the remaining balance for this record
      paymentForThisRecord = Math.min(paymentForThisRecord, record.remainingBalance);
      
      // Ensure we don't exceed remaining payment
      paymentForThisRecord = Math.min(paymentForThisRecord, remainingPayment);

      if (paymentForThisRecord <= 0) continue;

      // Update record with precise calculations
      record.amountPaid = Number((record.amountPaid + paymentForThisRecord).toFixed(2));
      record.remainingBalance = Number((record.remainingBalance - paymentForThisRecord).toFixed(2));
      
      // FIX: Only mark as "paid" if remaining balance is exactly 0, otherwise "partial"
      record.paymentStatus = record.remainingBalance <= 0.01 ? "paid" : "partial";
      
      record.lastPaymentDate = new Date();
      
      // Add to payment history
      record.paymentHistory.push({
        amount: paymentForThisRecord,
        paymentDate: new Date(),
        paymentMethod,
        receivedBy: userId,
        notes
      });

      await record.save({ session });
      paymentRecords.push({
        product: record.name,
        amount: paymentForThisRecord,
        remainingBalance: record.remainingBalance,
        paymentStatus: record.paymentStatus // Include status in response
      });

      remainingPayment = Number((remainingPayment - paymentForThisRecord).toFixed(2));
    }

    // Handle any remaining payment due to rounding errors
    if (remainingPayment > 0.01) {
      // Distribute the small remaining amount to the first record
      const firstRecord = salesRecords[0];
      if (firstRecord && firstRecord.remainingBalance > 0) {
        const finalPayment = Math.min(remainingPayment, firstRecord.remainingBalance);
        firstRecord.amountPaid = Number((firstRecord.amountPaid + finalPayment).toFixed(2));
        firstRecord.remainingBalance = Number((firstRecord.remainingBalance - finalPayment).toFixed(2));
        firstRecord.paymentStatus = firstRecord.remainingBalance <= 0.01 ? "paid" : "partial";
        
        firstRecord.paymentHistory.push({
          amount: finalPayment,
          paymentDate: new Date(),
          paymentMethod,
          receivedBy: userId,
          notes: "Rounding adjustment"
        });
        
        await firstRecord.save({ session });
        remainingPayment = Number((remainingPayment - finalPayment).toFixed(2));
      }
    }

    await session.commitTransaction();

    // Get updated records to verify
    const updatedRecords = await Sales.find({ transactionId }).session(session);
    const newTotalBalance = updatedRecords.reduce((sum, record) => sum + record.remainingBalance, 0);
    
    // Calculate overall payment status for the transaction
    const paidRecords = updatedRecords.filter(record => record.paymentStatus === "paid").length;
    const totalRecords = updatedRecords.length;
    const overallStatus = paidRecords === totalRecords ? "fully_paid" : "partially_paid";

    res.status(200).json({
      success: true,
      message: "Credit payment processed successfully",
      transactionId,
      totalPaid: paymentAmount,
      paymentRecords,
      newTotalBalance: Number(newTotalBalance.toFixed(2)),
      previousBalance: totalRemainingBalance,
      paymentStatus: overallStatus,
      details: `${paidRecords}/${totalRecords} items fully paid`
    });

  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({
      success: false,
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};
export const GetCreditSales = async (req, res) => {
  try {
    const { paymentStatus, customerPhone } = req.query;
    
    const query = { 
      saleType: "credit",
      status: "completed"
    };

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (customerPhone) {
      query.customerPhone = customerPhone;
    }

    const creditSales = await Sales.find(query)
      .populate("product", "name brand category")
      .populate("pharmacist", "name email")
      .populate("creditApprovedBy", "name email")
      .sort({ timestamp: -1 });

    // Group by transactionId
    const groupedSales = {};
    creditSales.forEach(sale => {
      if (!groupedSales[sale.transactionId]) {
        groupedSales[sale.transactionId] = {
          transactionId: sale.transactionId,
          patientName: sale.patientName,
          customerPhone: sale.customerPhone,
          customerAddress: sale.customerAddress,
          totalSaleAmount: 0,
          totalAmountPaid: 0,
          totalRemainingBalance: 0,
          paymentStatus: sale.paymentStatus,
          dueDate: sale.dueDate,
          creditApprovedBy: sale.creditApprovedBy,
          creditApprovedAt: sale.creditApprovedAt,
          timestamp: sale.timestamp,
          items: []
        };
      }

      groupedSales[sale.transactionId].items.push({
        product: sale.product,
        quantity: sale.quantitySold,
        saleAmount: sale.saleAmount,
        amountPaid: sale.amountPaid,
        remainingBalance: sale.remainingBalance
      });

      groupedSales[sale.transactionId].totalSaleAmount += sale.saleAmount;
      groupedSales[sale.transactionId].totalAmountPaid += sale.amountPaid;
      groupedSales[sale.transactionId].totalRemainingBalance += sale.remainingBalance;
    });

    res.status(200).json({
      success: true,
      count: Object.keys(groupedSales).length,
      creditSales: Object.values(groupedSales)
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
export const ConfirmSale = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    const { transactionId } = req.params
    const cashierId = req.user.id

    const salesRecords = await Sales.find({
      transactionId,
      status: "pending",
    }).session(session)

    if (!salesRecords.length) {
      throw new Error("No pending transactions found")
    }

    let currentProfit = 0
    for (const record of salesRecords) {
      // Update dispensary quantity. The pre/post save hooks on Dispensary model
      // will handle its status and notifications.
      const dispensary = await Dispensary.findOneAndUpdate(
        { product: record.product },
        { $inc: { quantity: -record.quantitySold } },
        { new: true, session },
      )

      // Update product total quantity (if product quantity represents total across locations)
      await Product.findByIdAndUpdate(record.product, { $inc: { quantity: -record.quantitySold } }, { session })

      // Update sales record
      record.status = "completed"
      record.cashier = cashierId
      currentProfit += record.profit
      record.completedAt = new Date()
      await record.save({ session })
      const product = await Product.findById(record.product);
      if (product.expiryDate <= new Date()) {
        await Notification.create({
          type: "Expired",
          message: `Sold expired product: ${product.name}`,
          product: product._id,
          location: "dispensary",
          read: false,
        });
      }
      await Dispensary.updateStatus(record.product, session);
    }

    // Update profit summary
    updateProfitSummary(currentProfit, new Date())

    await session.commitTransaction()
    res.json({
      success: true,
      transactionId,
      completedAt: new Date(),
      itemsCount: salesRecords.length,
    })
  } catch (error) {
    await session.abortTransaction()
    // REMOVED THE AUTOMATIC ABORTION - Only cashier can abort manually
    res.status(400).json({
      success: false,
      error: `Sale failed: ${error.message}`,
    })
  } finally {
    session.endSession()
  }
}

export const AbortSale = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    const { transactionId } = req.params
    const cashierId = req.user._id

    const salesRecords = await Sales.find({
      transactionId,
      status: "pending",
    }).session(session)

    if (!salesRecords.length) {
      throw new Error("No pending transactions found")
    }

    for (const record of salesRecords) {
      record.status = "aborted"
      record.abortedAt = new Date()
      record.cashier = cashierId
      await record.save({ session })
    }

    await session.commitTransaction()
    res.json({
      success: true,
      transactionId,
      abortedAt: new Date(),
      itemsCount: salesRecords.length,
    })
  } catch (error) {
    await session.abortTransaction()
    res.status(400).json({
      success: false,
      error: `Sale abort failed: ${error.message}`,
    })
  } finally {
    session.endSession()
  }
}

export const CloseDailyBalance = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    const { cashierId, countedAmount, date } = req.body
    // Validate input
    if (!cashierId || countedAmount === undefined || countedAmount === null) {
      return res.status(400).json({
        success: false,
        error: "Cashier ID and counted amount are required",
      })
    }

    // Parse the date or use today
    const targetDate = date ? new Date(date) : new Date()
    targetDate.setHours(0, 0, 0, 0)
    const nextDay = new Date(targetDate)
    nextDay.setDate(nextDay.getDate() + 1)

    // Check if cashier exists and is active
    const cashier = await User.findById(cashierId).session(session)
    if (!cashier) {
      throw new Error("Cashier not found")
    }
    if (cashier.status === "suspended") {
      throw new Error("Cannot close balance for suspended cashier")
    }

    // Check if daily balance already exists for this cashier and date
    const existingBalance = await DailyBalance.findOne({
      cashier: cashierId,
      date: targetDate,
    }).session(session)
    if (existingBalance) {
      throw new Error("Daily balance already closed for this date")
    }

    // Get all completed transactions for the specified date
    const transactions = await Sales.find({
      status: "completed",
      cashier: cashierId,
      completedAt: { $gte: targetDate, $lt: nextDay },
    }).session(session)

    // Calculate expected amount
    const expectedAmount = transactions.reduce((sum, transaction) => sum + transaction.saleAmount, 0)
    const difference = countedAmount - expectedAmount

    // Create daily balance record
    const dailyBalance = new DailyBalance({
      date: targetDate,
      expectedAmount,
      countedAmount: Number.parseFloat(countedAmount),
      difference,
      status: difference === 0 ? "verified" : "discrepancy",
      transactions: transactions.map((t) => t._id),
      cashier: cashierId,
      closedBy: req.user._id, // Admin who closed the balance
      closedAt: new Date(),
      ...(difference !== 0 && {
        discrepancyNote: `Expected: $${expectedAmount}, Counted: $${countedAmount}, Difference: $${difference}`,
      }),
    })
    await dailyBalance.save({ session })

    await session.commitTransaction()
    res.status(200).json({
      success: true,
      dailyBalance,
      transactionCount: transactions.length,
      expectedAmount,
      countedAmount: Number.parseFloat(countedAmount),
      difference,
      status: difference === 0 ? "verified" : "discrepancy",
    })
  } catch (error) {
    await session.abortTransaction()
    res.status(500).json({
      success: false,
      error: error.message,
    })
  } finally {
    session.endSession()
  }
}

export const GetDailyTransactions = async (req, res) => {
  try {
    const { cashierId } = req.params
    const { date } = req.query
    // Parse the date or use today
    const targetDate = date ? new Date(date) : new Date()
    targetDate.setHours(0, 0, 0, 0)
    const nextDay = new Date(targetDate)
    nextDay.setDate(nextDay.getDate() + 1)

    // Get all completed transactions for the specified date
    const transactions = await Sales.find({
      status: "completed",
      cashier: cashierId,
      completedAt: { $gte: targetDate, $lt: nextDay },
    })
      .populate("product", "name brand sellingPrice")
      .populate("pharmacist", "name")

    // Calculate totals
    const expectedAmount = transactions.reduce((sum, transaction) => sum + transaction.saleAmount, 0)
    const transactionCount = transactions.length

    res.status(200).json({
      success: true,
      cashierId,
      date: targetDate,
      expectedAmount,
      transactionCount,
      transactions: transactions.map((t) => ({
        id: t._id,
        transactionId: t.transactionId,
        productName: t.name,
        brand: t.brand,
        quantity: t.quantitySold,
        saleAmount: t.saleAmount,
        profit: t.profit,
        completedAt: t.completedAt,
        pharmacist: t.pharmacist?.name,
      })),
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}

export const GetAllCashiers = async (req, res) => {
  try {
    const cashiers = await User.find({
      role: "cashier",
      isDeleted: { $ne: true },
    }).select("name email role status createdAt")
    res.status(200).json({
      success: true,
      count: cashiers.length,
      cashiers,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}

export const SuspendCashier = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    const { cashierId } = req.params
    const { reason } = req.body
    const adminId = req.user._id

    // Find the cashier
    const cashier = await User.findById(cashierId).session(session)
    if (!cashier) {
      throw new Error("Cashier not found")
    }
    if (cashier.role !== "cashier") {
      throw new Error("User is not a cashier")
    }
    if (cashier.status === "suspended") {
      throw new Error("Cashier is already suspended")
    }

    // Update cashier status
    cashier.status = "suspended"
    cashier.suspendedBy = adminId
    cashier.suspendedAt = new Date()
    cashier.suspensionReason = reason || "Daily balance discrepancy"
    await cashier.save({ session })

    // Create notification for suspension
    const notification = new Notification({
      type: "UserSuspended",
      message: `Cashier ${cashier.name} has been suspended due to: ${reason || "Daily balance discrepancy"}`,
      user: cashierId,
      createdBy: adminId,
      read: false,
    })
    await notification.save({ session })

    await session.commitTransaction()
    res.status(200).json({
      success: true,
      message: "Cashier suspended successfully",
      cashier: {
        id: cashier._id,
        name: cashier.name,
        email: cashier.email,
        status: cashier.status,
        suspendedAt: cashier.suspendedAt,
        suspensionReason: cashier.suspensionReason,
      },
    })
  } catch (error) {
    await session.abortTransaction()
    res.status(500).json({
      success: false,
      error: error.message,
    })
  } finally {
    session.endSession()
  }
}

export const GetDailyBalanceHistory = async (req, res) => {
  try {
    const { startDate, endDate, cashierId } = req.query
    // Build query conditions
    const query = {}
    if (startDate || endDate) {
      query.date = {}
      if (startDate) query.date.$gte = new Date(startDate)
      if (endDate) query.date.$lte = new Date(endDate)
    }
    if (cashierId) {
      query.cashier = cashierId
    }

    const balances = await DailyBalance.find(query)
      .populate("cashier", "name email")
      .populate("closedBy", "name email")
      .sort({ date: -1 })

    res.status(200).json({
      success: true,
      count: balances.length,
      balances: balances.map((balance) => ({
        id: balance._id,
        date: balance.date,
        cashier: balance.cashier,
        expectedAmount: balance.expectedAmount,
        countedAmount: balance.countedAmount,
        difference: balance.difference,
        status: balance.status,
        transactionCount: balance.transactions.length,
        discrepancyNote: balance.discrepancyNote,
        closedBy: balance.closedBy,
        closedAt: balance.closedAt,
      })),
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}

export async function GetAllPendingStatus(req, res) {
  try {
    const PendingTransaction = await Sales.find({ status: "pending" })
      .populate("pharmacist", "name email role")
      .populate("product", "name brand batchNo sellingPrice category")
    const pendingOrders = transformSalesRecords(PendingTransaction) // Assuming transformSalesRecords handles the new structure
    res.status(200).json(pendingOrders)
  } catch (error) {
    res.status(500).json({ massage: error.message })
  }
}

export async function GetAbortAndComplatedSale(req, res) {
  try {
    const TransactionHistory = await Sales.find({
      $or: [
        { status: "completed" },
        { status: "aborted" },
        { status: "refunded" } // Include refunded
      ],
    })
      .populate("pharmacist", "name email role")
      .populate("product", "name brand batchNo sellingPrice DosageForms category unitPrice")
      .populate("cashier", "name email role")

    // Group transactions by transactionId
    const groupedTransactions = {}
    TransactionHistory.forEach((record) => {
      const tid = record.transactionId
      if (!groupedTransactions[tid]) {
        groupedTransactions[tid] = {
          id: tid,
          patientName: record.patientName,
          items: [],
          totalAmount: 0,
          timestamp: record.timestamp,
          pharmacist: record.pharmacist.name,
          cashier: record.cashier?.name || null,
          status: record.status,
        }
      }
      // Add item details
      groupedTransactions[tid].items.push({
        productId: record.product._id,
        name: record.product.name,
        brand: record.product.brand,
        category: record.product.category,
        dosageForm: record.product.DosageForms,
        quantity: record.quantitySold,
        unitPrice: record.product.unitPrice,
        sellingPrice: record.product.sellingPrice,
        total: record.saleAmount,
        refundedAt: record.refundedAt // Add refundedAt for frontend
      })
      // Update transaction total
      groupedTransactions[tid].totalAmount += record.saleAmount
    })

    // Convert to array
    const result = Object.values(groupedTransactions)
    res.status(200).json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const GetRecentSales = async (req, res) => {
  try {
    const limit = 7 // Set limit to 7 recent sales

    const recentSales = await Sales.find({ status: "completed" })
      .sort({ completedAt: -1 }) // Sort by most recent first
      .limit(limit)
      .select("name brand saleAmount profit completedAt -_id")
    res.status(200).json({
      success: true,
      count: recentSales.length,
      sales: recentSales.map((sale) => ({
        productName: sale.name,
        brand: sale.brand,
        dateSold: sale.completedAt,
        saleAmount: sale.saleAmount,
        profit: sale.profit,
      })),
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to fetch recent sales: ${error.message}`,
    })
  }
}

export const GetTotalSales = async (req, res) => {
  try {
    // Extract optional date filters from query parameters
    const { startDate, endDate } = req.query

    // Build match conditions for aggregation pipeline
    const matchConditions = {
      status: "completed",
    }
    // Add date filtering if provided
    if (startDate || endDate) {
      matchConditions.completedAt = {}
      if (startDate) matchConditions.completedAt.$gte = new Date(startDate)
      if (endDate) matchConditions.completedAt.$lte = new Date(endDate)
    }

    // Aggregation pipeline to calculate total sales
    const result = await Sales.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$saleAmount" },
          totalProfit: { $sum: "$profit" },
          transactionCount: { $sum: 1 },
        },
      },
    ])

    // Handle case with no sales data
    if (result.length === 0) {
      return res.status(200).json({
        totalSales: 0,
        totalProfit: 0,
        transactionCount: 0,
      })
    }

    // Return aggregated results
    res.status(200).json({
      totalSales: result[0].totalSales,
      totalProfit: result[0].totalProfit,
      transactionCount: result[0].transactionCount,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}
export const UndoSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { transactionId, productId } = req.body;
    const userId = req.user._id;

    let salesRecords;

    // Determine if this is a credit sale or regular sale
    if (productId) {
      // Regular sale - single product
      const salesRecord = await Sales.findOne({
        transactionId,
        product: productId,
        status: "completed"
      }).session(session);

      if (!salesRecord) {
        throw new Error("Sales record not found");
      }
      salesRecords = [salesRecord];
    } else {
      // Credit sale - multiple products under same transactionId
      salesRecords = await Sales.find({
        transactionId,
        status: "completed",
        saleType: "credit"
      }).session(session);

      if (salesRecords.length === 0) {
        throw new Error("Credit sales records not found");
      }
    }

    // Process all sales records
    const transferIds = [];
    
    for (const salesRecord of salesRecords) {
      const productId = salesRecord.product;

      // Get product details
      const product = await Product.findById(productId).session(session);
      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }

      // Update dispensary quantity
      await Dispensary.findOneAndUpdate(
        { product: productId },
        { $inc: { quantity: salesRecord.quantitySold } },
        { session }
      );

      // Update product total quantity
      await Product.findByIdAndUpdate(
        productId,
        { $inc: { quantity: salesRecord.quantitySold } },
        { session }
      );

      // For credit sales, also reset payment status and amounts
      if (salesRecord.saleType === "credit") {
        salesRecord.paymentStatus = "credit";
        salesRecord.amountPaid = 0;
        salesRecord.remainingBalance = salesRecord.saleAmount;
        salesRecord.paymentHistory = [];
        salesRecord.lastPaymentDate = null;
      }

      // Create transfer record for refund
      const transfer = new Transfare({
        product: productId,
        user: userId,
        type: salesRecord.saleType === "credit" ? "CREDIT_REFUND" : "RETURN_REFUND",
        quantity: salesRecord.quantitySold,
        quantityLeft: (await Dispensary.findOne({ product: productId }).session(session)).quantity,
        totalQuantity: product.quantity + salesRecord.quantitySold,
        issuedPrice: salesRecord.saleAmount / salesRecord.quantitySold,
        unitPrice: product.unitPrice,
        totalIssuedPrice: salesRecord.saleAmount,
        totalUnitPrice: product.unitPrice * salesRecord.quantitySold,
        date: new Date(),
        notes: `Undo ${salesRecord.saleType === "credit" ? 'credit' : 'regular'} sale - Transaction: ${transactionId}`
      });

      await transfer.save({ session });
      transferIds.push(transfer._id);

      // Mark sales record as refunded
      salesRecord.status = "refunded";
      salesRecord.refundedAt = new Date();
      salesRecord.refundedBy = userId;
      await salesRecord.save({ session });
    }

    await session.commitTransaction();
    
    res.json({
      success: true,
      message: salesRecords.length > 1 
        ? "Credit transaction undone successfully" 
        : "Transaction undone successfully",
      transactionId,
      refundedItems: salesRecords.length,
      transferIds
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