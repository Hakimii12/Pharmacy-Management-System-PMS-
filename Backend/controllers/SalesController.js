import mongoose from "mongoose"
import Product from "../models/ProductModel.js"
import Dispensary from "../models/DispensaryModel.js"
import Sales from "../models/SalesModel.js"
import DailyBalance from "../models/DailyBalance.js"
import { updateProfitSummary } from "../utils/profitUtils.js" // Assuming this utility exists
import Notification from "../models/NotificationModel.js"
import User from "../models/UserModel.js"
import Transfare from "../models/Transfer.js"
import { getPagination, paginated, facetPage, readFacet, searchRegex, dateRange } from "../utils/pagination.js"

/*
 * Sales are stored one row per line-item, but every screen consumes them grouped
 * by transaction. That grouping used to happen in JS after loading the entire
 * collection; it now happens in MongoDB so we can paginate transactions (not rows)
 * and only ever ship one page over the wire.
 */

/** $group stage that collapses line-item rows into a single transaction document. */
const GROUP_BY_TRANSACTION = {
  $group: {
    _id: "$transactionId",
    patientName: { $first: "$patientName" },
    customerPhone: { $first: "$customerPhone" },
    customerAddress: { $first: "$customerAddress" },
    saleType: { $first: "$saleType" },
    status: { $first: "$status" },
    timestamp: { $first: "$timestamp" },
    completedAt: { $first: "$completedAt" },
    abortedAt: { $first: "$abortedAt" },
    refundedAt: { $first: "$refundedAt" },
    dueDate: { $first: "$dueDate" },
    creditApprovedBy: { $first: "$creditApprovedBy" },
    creditApprovedAt: { $first: "$creditApprovedAt" },
    lastPaymentDate: { $first: "$lastPaymentDate" },
    pharmacist: { $first: "$pharmacist" },
    cashier: { $first: "$cashier" },
    totalAmount: { $sum: "$saleAmount" },
    totalProfit: { $sum: "$profit" },
    amountPaid: { $sum: "$amountPaid" },
    remainingBalance: { $sum: "$remainingBalance" },
    itemCount: { $sum: 1 },
    items: {
      $push: {
        saleId: "$_id",
        product: "$product",
        name: "$name",
        brand: "$brand",
        dosageForm: "$dosageForm",
        quantity: "$quantitySold",
        sellingPrice: "$sellingPrice",
        saleAmount: "$saleAmount",
        amountPaid: "$amountPaid",
        remainingBalance: "$remainingBalance",
        status: "$status",
        refundedAt: "$refundedAt",
      },
    },
  },
}

/**
 * Transaction-level payment state derived from the summed line items, rather than
 * `$first` off an arbitrary row — individual rows can disagree after a partial
 * payment is distributed across them.
 */
const DERIVE_PAYMENT_STATE = {
  $addFields: {
    paymentStatus: {
      $cond: [
        { $eq: ["$saleType", "credit"] },
        {
          $switch: {
            branches: [
              { case: { $lte: ["$remainingBalance", 0.01] }, then: "paid" },
              { case: { $gt: ["$amountPaid", 0] }, then: "partial" },
            ],
            default: "credit",
          },
        },
        { $cond: [{ $eq: ["$status", "completed"] }, "paid", "pending"] },
      ],
    },
    isOverdue: {
      $and: [
        { $gt: ["$remainingBalance", 0.01] },
        { $ne: ["$dueDate", null] },
        { $lt: ["$dueDate", new Date()] },
      ],
    },
  },
}

/**
 * Joins product and user detail onto a page of grouped transactions. These stages
 * run *after* $skip/$limit so the lookups only touch the current page.
 */
const ENRICH_TRANSACTION_PAGE = [
  {
    $lookup: {
      from: "products",
      localField: "items.product",
      foreignField: "_id",
      as: "productDocs",
      pipeline: [
        { $project: { name: 1, brand: 1, category: 1, DosageForms: 1, batchNo: 1, unitPrice: 1, sellingPrice: 1 } },
      ],
    },
  },
  {
    $lookup: {
      from: "users",
      localField: "pharmacist",
      foreignField: "_id",
      as: "pharmacistDoc",
      pipeline: [{ $project: { name: 1, email: 1, role: 1 } }],
    },
  },
  {
    $lookup: {
      from: "users",
      localField: "cashier",
      foreignField: "_id",
      as: "cashierDoc",
      pipeline: [{ $project: { name: 1, email: 1, role: 1 } }],
    },
  },
  {
    $lookup: {
      from: "users",
      localField: "creditApprovedBy",
      foreignField: "_id",
      as: "creditApprovedByDoc",
      pipeline: [{ $project: { name: 1, email: 1 } }],
    },
  },
  {
    $addFields: {
      pharmacist: { $arrayElemAt: ["$pharmacistDoc", 0] },
      cashier: { $arrayElemAt: ["$cashierDoc", 0] },
      creditApprovedBy: { $arrayElemAt: ["$creditApprovedByDoc", 0] },
      items: {
        $map: {
          input: "$items",
          as: "item",
          in: {
            $mergeObjects: [
              "$$item",
              {
                $let: {
                  vars: {
                    prod: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$productDocs",
                            as: "candidate",
                            cond: { $eq: ["$$candidate._id", "$$item.product"] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: {
                    productId: "$$item.product",
                    name: { $ifNull: ["$$item.name", "$$prod.name"] },
                    brand: { $ifNull: ["$$item.brand", "$$prod.brand"] },
                    category: "$$prod.category",
                    dosageForm: { $ifNull: ["$$item.dosageForm", "$$prod.DosageForms"] },
                    batchNo: "$$prod.batchNo",
                    unitPrice: "$$prod.unitPrice",
                    sellingPrice: { $ifNull: ["$$item.sellingPrice", "$$prod.sellingPrice"] },
                    total: "$$item.saleAmount",
                  },
                },
              },
            ],
          },
        },
      },
    },
  },
  { $addFields: { id: "$_id", transactionId: "$_id" } },
  { $project: { _id: 0, productDocs: 0, pharmacistDoc: 0, cashierDoc: 0, creditApprovedByDoc: 0 } },
]

/**
 * Runs the grouped-transaction pipeline and returns one page plus the total count.
 *
 * @param {object} opts.match          $match applied to line items (index-friendly)
 * @param {object} opts.postGroupMatch $match applied after grouping (derived fields)
 */
async function findTransactions({ match, postGroupMatch, page, limit, skip, sort = { timestamp: -1 } }) {
  const pipeline = [{ $match: match }, { $sort: sort }, GROUP_BY_TRANSACTION, DERIVE_PAYMENT_STATE]

  if (postGroupMatch && Object.keys(postGroupMatch).length > 0) {
    pipeline.push({ $match: postGroupMatch })
  }

  pipeline.push(
    ...facetPage([{ $sort: sort }, { $skip: skip }, { $limit: limit }, ...ENRICH_TRANSACTION_PAGE]),
  )

  const { data, total } = readFacet(await Sales.aggregate(pipeline))
  return paginated(data, { page, limit, total })
}
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
        name: item.name,
        brand: item.brand,
        dosageForm: item.dosageForm,
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

    // Re-read outside the (now committed) session and total in MongoDB.
    const [rollup] = await Sales.aggregate([
      { $match: { transactionId } },
      {
        $group: {
          _id: null,
          newTotalBalance: { $sum: "$remainingBalance" },
          totalRecords: { $sum: 1 },
          paidRecords: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] } },
        },
      },
    ]);

    const newTotalBalance = rollup?.newTotalBalance || 0;
    const paidRecords = rollup?.paidRecords || 0;
    const totalRecords = rollup?.totalRecords || 0;
    const overallStatus = totalRecords > 0 && paidRecords === totalRecords ? "fully_paid" : "partially_paid";

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
    const { page, limit, skip } = getPagination(req.query)
    const { paymentStatus, customerPhone, search, overdue, startDate, endDate } = req.query

    const match = { saleType: "credit", status: "completed" }
    if (customerPhone) match.customerPhone = customerPhone
    if (search) match.patientName = searchRegex(search)
    const range = dateRange(startDate, endDate)
    if (range) match.timestamp = range

    // paymentStatus and overdue are derived from the summed transaction, so they
    // can only be matched after $group.
    const postGroupMatch = {}
    if (paymentStatus) postGroupMatch.paymentStatus = paymentStatus
    if (overdue === "true") postGroupMatch.isOverdue = true

    const result = await findTransactions({ match, postGroupMatch, page, limit, skip })
    return res.status(200).json(result)
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

    // Batch-fetch all relevant products ONCE before the loop (avoids N extra DB calls)
    const productIds = [...new Set(salesRecords.map((r) => String(r.product)))]
    const productDocs = await Product.find(
      { _id: { $in: productIds } },
      { name: 1, expiryDate: 1 }
    )
      .session(session)
      .lean()
    const productMap = new Map(productDocs.map((p) => [String(p._id), p]))

    const now = new Date()
    let currentProfit = 0
    const expiredNotifOps = []

    for (const record of salesRecords) {
      // Update dispensary quantity
      await Dispensary.findOneAndUpdate(
        { product: record.product },
        { $inc: { quantity: -record.quantitySold } },
        { new: true, session },
      )

      // Update product total quantity
      await Product.findByIdAndUpdate(record.product, { $inc: { quantity: -record.quantitySold } }, { session })

      // Update sales record
      record.status = "completed"
      record.cashier = cashierId
      currentProfit += record.profit
      record.completedAt = now
      await record.save({ session })

      // Use the pre-fetched product map — no extra DB call
      const product = productMap.get(String(record.product))
      if (product && product.expiryDate <= now) {
        // Collect for bulk upsert (prevents duplicate notifications)
        expiredNotifOps.push({
          updateOne: {
            filter: { product: product._id, type: "Expired", location: "dispensary", read: false },
            update: {
              $setOnInsert: {
                type: "Expired",
                message: `Sold expired product: ${product.name}`,
                product: product._id,
                location: "dispensary",
                read: false,
              },
            },
            upsert: true,
          },
        })
      }

      await Dispensary.updateStatus(record.product, session)
    }

    // Write expired notifications in one bulk operation
    if (expiredNotifOps.length > 0) {
      await Notification.bulkWrite(expiredNotifOps, { ordered: false })
    }

    // Update profit summary
    updateProfitSummary(currentProfit, now)

    await session.commitTransaction()
    res.json({
      success: true,
      transactionId,
      completedAt: now,
      itemsCount: salesRecords.length,
    })
  } catch (error) {
    await session.abortTransaction()
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

    // Sum and collect ids in MongoDB rather than pulling every sale document back.
    const [totals] = await Sales.aggregate([
      {
        $match: {
          status: "completed",
          cashier: new mongoose.Types.ObjectId(cashierId),
          completedAt: { $gte: targetDate, $lt: nextDay },
        },
      },
      { $group: { _id: null, expectedAmount: { $sum: "$saleAmount" }, ids: { $push: "$_id" } } },
    ]).session(session)

    const expectedAmount = totals?.expectedAmount || 0
    const transactionIds = totals?.ids || []
    const difference = countedAmount - expectedAmount

    // Create daily balance record
    const dailyBalance = new DailyBalance({
      date: targetDate,
      expectedAmount,
      countedAmount: Number.parseFloat(countedAmount),
      difference,
      status: difference === 0 ? "verified" : "discrepancy",
      transactions: transactionIds,
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
      transactionCount: transactionIds.length,
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
    const { page, limit, skip } = getPagination(req.query)

    // Parse the date or use today
    const targetDate = date ? new Date(date) : new Date()
    targetDate.setHours(0, 0, 0, 0)
    const nextDay = new Date(targetDate)
    nextDay.setDate(nextDay.getDate() + 1)

    const query = {
      status: "completed",
      cashier: cashierId,
      completedAt: { $gte: targetDate, $lt: nextDay },
    }

    // The day's total must cover every transaction, not just the current page,
    // so it is computed by aggregation alongside the paged read.
    const [transactions, total, [totals]] = await Promise.all([
      Sales.find(query)
        .sort({ completedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("transactionId name brand quantitySold saleAmount profit completedAt pharmacist")
        .populate("pharmacist", "name")
        .lean(),
      Sales.countDocuments(query),
      Sales.aggregate([
        { $match: { ...query, cashier: new mongoose.Types.ObjectId(cashierId) } },
        { $group: { _id: null, expectedAmount: { $sum: "$saleAmount" } } },
      ]),
    ])

    res.status(200).json({
      ...paginated(
        transactions.map((t) => ({
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
        { page, limit, total },
      ),
      cashierId,
      date: targetDate,
      expectedAmount: totals?.expectedAmount || 0,
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
    const { page, limit, skip } = getPagination(req.query)
    const query = { role: "cashier", isDeleted: { $ne: true } }

    const [cashiers, total] = await Promise.all([
      User.find(query).select("name email role status createdAt").sort({ name: 1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(query),
    ])

    res.status(200).json(paginated(cashiers, { page, limit, total }))
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
    const { startDate, endDate, cashierId, status } = req.query
    const { page, limit, skip } = getPagination(req.query)

    const query = {}
    const range = dateRange(startDate, endDate)
    if (range) query.date = range
    if (cashierId) query.cashier = cashierId
    if (status) query.status = status

    const [balances, total] = await Promise.all([
      DailyBalance.find(query)
        .populate("cashier", "name email")
        .populate("closedBy", "name email")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DailyBalance.countDocuments(query),
    ])

    const data = balances.map((balance) => ({
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
    }))

    res.status(200).json(paginated(data, { page, limit, total }))
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}

export async function GetAllPendingStatus(req, res) {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const { search } = req.query

    const match = { status: "pending" }
    if (search) match.patientName = searchRegex(search)

    const result = await findTransactions({ match, page, limit, skip })
    res.status(200).json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export async function GetAbortAndComplatedSale(req, res) {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const { status, saleType, paymentStatus, customerPhone, search, pharmacist, cashier, startDate, endDate } =
      req.query

    // Filtering used to happen entirely in the browser over the full history.
    // It now runs server-side so pagination is meaningful.
    const match = {
      status: status ? status : { $in: ["completed", "aborted", "refunded"] },
    }
    if (saleType) match.saleType = saleType
    if (customerPhone) match.customerPhone = searchRegex(customerPhone)
    if (search) match.patientName = searchRegex(search)
    if (pharmacist && mongoose.Types.ObjectId.isValid(pharmacist)) {
      match.pharmacist = new mongoose.Types.ObjectId(pharmacist)
    }
    if (cashier && mongoose.Types.ObjectId.isValid(cashier)) {
      match.cashier = new mongoose.Types.ObjectId(cashier)
    }
    const range = dateRange(startDate, endDate)
    if (range) match.timestamp = range

    const postGroupMatch = paymentStatus ? { paymentStatus } : null

    const result = await findTransactions({ match, postGroupMatch, page, limit, skip })
    res.status(200).json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const GetRecentSales = async (req, res) => {
  try {
    const { limit } = getPagination(req.query, { defaultLimit: 7, maxLimit: 50 })

    const recentSales = await Sales.find({ status: "completed" })
      .sort({ completedAt: -1 })
      .limit(limit)
      .select("name brand saleAmount profit completedAt -_id")
      .lean()
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

    // Rolled up per transaction first: `Sales` holds one document per line item,
    // so counting documents here would report a five-item basket as five sales.
    const [result] = await Sales.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: "$transactionId",
          saleAmount: { $sum: "$saleAmount" },
          profit: { $sum: "$profit" },
          itemCount: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$saleAmount" },
          totalProfit: { $sum: "$profit" },
          transactionCount: { $sum: 1 },
          itemCount: { $sum: "$itemCount" },
        },
      },
    ])

    res.status(200).json({
      totalSales: result?.totalSales || 0,
      totalProfit: result?.totalProfit || 0,
      transactionCount: result?.transactionCount || 0,
      itemCount: result?.itemCount || 0,
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