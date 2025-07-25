import mongoose from "mongoose"
import Product from "../models/ProductModel.js"
import Dispensary from "../models/DispensaryModel.js"
import Sales from "../models/SalesModel.js"
import DailyBalance from "../models/DailyBalance.js"
import { updateProfitSummary } from "../utils/profitUtils.js"
import Notification from "../models/NotificationModel.js"
import transformSalesRecords from "../utils/transformSalesRecords.js"
import User from "../models/UserModel.js"
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
      const product = await Product.findById(record.product).session(session)

      // Update dispensary and product quantities
      const dispensary = await Dispensary.findOneAndUpdate(
        { product: record.product },
        { $inc: { quantity: -record.quantitySold } },
        { new: true, session },
      )

      await Product.findByIdAndUpdate(record.product, { $inc: { quantity: -record.quantitySold } }, { session })

      const quantity = dispensary ? dispensary.quantity : 0
      const threshold = dispensary ? dispensary.threshold : 10

      // Update expiration status if stock depleted
      if (product.quantity <= 0) {
        product.isExpired = product.expiryDate < new Date()
        await product.save({ session })
      }

      // Update sales record
      record.status = "completed"
      record.cashier = cashierId
      currentProfit += record.profit
      record.completedAt = new Date()
      await record.save({ session })

      // Create notifications for low stock or out of stock
      if (quantity === 0 || quantity < threshold) {
        const type = quantity === 0 ? "OutOfStock" : "LowStock"
        const message =
          quantity === 0
            ? `Product ${product.name} is out of stock in dispensary.`
            : `Product ${product.name} is low in dispensary. Current: ${quantity}, Threshold: ${threshold}.`

        const existing = await Notification.findOne({
          product: product._id,
          location: "dispensary",
          type,
          read: false,
        }).session(session)

        if (!existing) {
          const notification = new Notification({
            type,
            message,
            product: product._id,
            location: "dispensary",
            read: false,
          })
          await notification.save({ session })
        }
      }
    }

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

    // Mark as aborted on failure
    await Sales.updateMany(
      { transactionId: req.params.transactionId, status: "pending" },
      { $set: { status: "aborted" } },
    )

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

// NEW: Get daily transactions for a specific cashier
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

// NEW: Get all cashiers
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

// NEW: Suspend cashier account
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

// NEW: Get daily balance history
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
    const pendingOrders = transformSalesRecords(PendingTransaction)
    res.status(200).json(pendingOrders)
  } catch (error) {
    res.status(500).json({ massage: error.message })
  }
}

export async function GetAbortAndComplatedSale(req, res) {
  try {
    const TransactionHistory = await Sales.find({
      $or: [{ status: "completed" }, { status: "aborted" }],
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
    const limit = 7; // Set limit to 7 recent sales
    
    const recentSales = await Sales.find({ status: "completed" })
      .sort({ completedAt: -1 }) // Sort by most recent first
      .limit(limit)
      .select('name brand saleAmount profit completedAt -_id');

    res.status(200).json({
      success: true,
      count: recentSales.length,
      sales: recentSales.map(sale => ({
        productName: sale.name,
        brand: sale.brand,
        dateSold: sale.completedAt,
        saleAmount: sale.saleAmount,
        profit: sale.profit
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to fetch recent sales: ${error.message}`
    });
  }
};
// Add this new endpoint controller to your sales controller file
export const GetTotalSales = async (req, res) => {
  try {
    // Extract optional date filters from query parameters
    const { startDate, endDate } = req.query;
    
    // Build match conditions for aggregation pipeline
    const matchConditions = {
      status: "completed"
    };

    // Add date filtering if provided
    if (startDate || endDate) {
      matchConditions.completedAt = {};
      if (startDate) matchConditions.completedAt.$gte = new Date(startDate);
      if (endDate) matchConditions.completedAt.$lte = new Date(endDate);
    }

    // Aggregation pipeline to calculate total sales
    const result = await Sales.aggregate([
      { $match: matchConditions },
      { 
        $group: {
          _id: null,
          totalSales: { $sum: "$saleAmount" },
          totalProfit: { $sum: "$profit" },
          transactionCount: { $sum: 1 }
        }
      }
    ]);

    // Handle case with no sales data
    if (result.length === 0) {
      return res.status(200).json({
        totalSales: 0,
        totalProfit: 0,
        transactionCount: 0
      });
    }

    // Return aggregated results
    res.status(200).json({
      totalSales: result[0].totalSales,
      totalProfit: result[0].totalProfit,
      transactionCount: result[0].transactionCount
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};
