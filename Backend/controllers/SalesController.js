import { Op, fn, col, literal } from "sequelize";
import { sequelize } from "../database/database.js";
import Product from "../models/ProductModel.js";
import Dispensary from "../models/DispensaryModel.js";
import Sales from "../models/SalesModel.js";
import DailyBalance from "../models/DailyBalance.js";
import Notification from "../models/NotificationModel.js";
import User from "../models/UserModel.js";
import Transfare from "../models/Transfer.js";
import { updateProfitSummary } from "../utils/profitUtils.js";
import { getPagination, paginated, searchLike } from "../utils/pagination.js";

function generateTransactionId() {
  return `TRX-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

async function findTransactions({ where = {}, postGroupMatch = {}, page, limit, skip, order = [["timestamp", "DESC"]] }) {
  // Step 1: Find distinct transactionIds with pagination
  const distinctTransactions = await Sales.findAll({
    attributes: [
      "transactionId",
      [fn("MAX", col("timestamp")), "maxTimestamp"],
      [fn("MAX", col("completedAt")), "maxCompletedAt"],
    ],
    where,
    group: ["transactionId"],
    order: [[literal("maxTimestamp"), "DESC"]],
    raw: true,
  });

  const total = distinctTransactions.length;
  const pagedTxIds = distinctTransactions.slice(skip, skip + limit).map((t) => t.transactionId);

  if (pagedTxIds.length === 0) {
    return paginated([], { page, limit, total: 0 });
  }

  // Step 2: Fetch all sales items for these transactions
  const salesItems = await Sales.findAll({
    where: { transactionId: { [Op.in]: pagedTxIds } },
    include: [
      {
        model: Product,
        as: "productDetails",
        attributes: ["id", "name", "brand", "category", "DosageForms", "batchNo", "unitPrice", "sellingPrice"],
      },
      { model: User, as: "pharmacistUser", attributes: ["id", "name", "email", "role"] },
      { model: User, as: "cashierUser", attributes: ["id", "name", "email", "role"] },
    ],
    order,
  });

  // Step 3: Group items by transactionId
  const txMap = new Map();
  for (const item of salesItems) {
    const txId = item.transactionId;
    if (!txMap.has(txId)) {
      txMap.set(txId, {
        id: txId,
        _id: txId,
        transactionId: txId,
        patientName: item.patientName,
        customerPhone: item.customerPhone,
        customerAddress: item.customerAddress,
        saleType: item.saleType,
        status: item.status,
        timestamp: item.timestamp,
        completedAt: item.completedAt,
        abortedAt: item.abortedAt,
        refundedAt: item.refundedAt,
        dueDate: item.dueDate,
        creditApprovedBy: item.creditApprovedBy,
        creditApprovedAt: item.creditApprovedAt,
        lastPaymentDate: item.lastPaymentDate,
        pharmacist: item.pharmacistUser ? item.pharmacistUser.toJSON() : null,
        cashier: item.cashierUser ? item.cashierUser.toJSON() : null,
        totalAmount: 0,
        totalProfit: 0,
        amountPaid: 0,
        remainingBalance: 0,
        itemCount: 0,
        items: [],
      });
    }

    const tx = txMap.get(txId);
    tx.totalAmount += item.saleAmount || 0;
    tx.totalProfit += item.profit || 0;
    tx.amountPaid += item.amountPaid || 0;
    tx.remainingBalance += item.remainingBalance || 0;
    tx.itemCount += 1;

    const prod = item.productDetails || {};
    tx.items.push({
      saleId: item.id,
      _id: item.id,
      product: item.productId,
      productId: item.productId,
      name: item.name || prod.name,
      brand: item.brand || prod.brand,
      category: prod.category,
      dosageForm: item.dosageForm || prod.DosageForms,
      batchNo: prod.batchNo,
      unitPrice: prod.unitPrice,
      sellingPrice: item.sellingPrice || prod.sellingPrice,
      total: item.saleAmount,
      quantity: item.quantitySold,
      saleAmount: item.saleAmount,
      amountPaid: item.amountPaid,
      remainingBalance: item.remainingBalance,
      status: item.status,
      refundedAt: item.refundedAt,
    });
  }

  let resultList = Array.from(txMap.values()).map((tx) => {
    tx.totalAmount = Math.round(tx.totalAmount * 100) / 100;
    tx.totalProfit = Math.round(tx.totalProfit * 100) / 100;
    tx.amountPaid = Math.round(tx.amountPaid * 100) / 100;
    tx.remainingBalance = Math.round(tx.remainingBalance * 100) / 100;

    let paymentStatus;
    if (tx.saleType === "credit") {
      if (tx.remainingBalance <= 0.01) paymentStatus = "paid";
      else if (tx.amountPaid > 0) paymentStatus = "partial";
      else paymentStatus = "credit";
    } else {
      paymentStatus = tx.status === "completed" ? "paid" : "pending";
    }

    const isOverdue =
      tx.remainingBalance > 0.01 && tx.dueDate && new Date(tx.dueDate) < new Date();

    return {
      ...tx,
      paymentStatus,
      isOverdue: Boolean(isOverdue),
    };
  });

  // Post-group filter if any
  if (postGroupMatch) {
    if (postGroupMatch.paymentStatus) {
      resultList = resultList.filter((tx) => tx.paymentStatus === postGroupMatch.paymentStatus);
    }
    if (postGroupMatch.isOverdue !== undefined) {
      resultList = resultList.filter((tx) => tx.isOverdue === postGroupMatch.isOverdue);
    }
  }

  return paginated(resultList, { page, limit, total });
}

export const PrepareAndSaveSale = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const pharmacistId = req.user.id || req.user._id;
    const { items, patientName } = req.body;
    const preparedItems = [];
    let grandTotal = 0;
    const transactionId = generateTransactionId();
    const timestamp = new Date();

    for (const item of items) {
      const product = await Product.findOne({
        where: { id: item.productId, isDeleted: false },
        transaction: t,
      });
      if (!product) {
        throw new Error(`Product not found or has been deleted: ${item.productId}`);
      }

      const dispensary = await Dispensary.findOne({
        where: { productId: item.productId, isDeleted: false, isActive: true },
        transaction: t,
      });
      if (!dispensary) {
        throw new Error(`Product ${product.name} is not available in dispensary`);
      }

      if (dispensary.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${dispensary.quantity}`);
      }

      if (new Date(product.expiryDate) < new Date()) {
        throw new Error(`Product expired: ${product.name} (Batch: ${product.batchNo})`);
      }

      const saleAmount = product.sellingPrice * item.quantity;
      const profit = (product.sellingPrice - product.unitPrice) * item.quantity;

      preparedItems.push({
        productId: product.id,
        name: product.name,
        brand: product.brand,
        quantity: item.quantity,
        saleAmount,
        profit,
        dosageForm: product.DosageForms,
      });
      grandTotal += saleAmount;
    }

    const salesRecords = [];
    for (const item of preparedItems) {
      const saleRecord = await Sales.create(
        {
          transactionId,
          productId: item.productId,
          name: item.name,
          patientName,
          brand: item.brand,
          quantitySold: item.quantity,
          profit: item.profit,
          saleAmount: item.saleAmount,
          status: "pending",
          pharmacistId,
          dosageForm: item.dosageForm,
          timestamp,
        },
        { transaction: t }
      );
      salesRecords.push(saleRecord.toJSON());
    }

    await t.commit();
    res.status(201).json({
      success: true,
      transactionId,
      grandTotal,
      items: preparedItems,
      salesRecords,
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

export const CreateCreditSale = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const pharmacistId = req.user.id || req.user._id;
    const {
      items,
      patientName,
      customerPhone,
      customerAddress,
      dueDate,
      amountPaid = 0,
    } = req.body;

    const preparedItems = [];
    let grandTotal = 0;
    const transactionId = generateTransactionId();
    const timestamp = new Date();

    let calculatedDueDate = dueDate ? new Date(dueDate) : new Date();
    if (!dueDate) {
      calculatedDueDate.setDate(calculatedDueDate.getDate() + 30);
    }

    for (const item of items) {
      const product = await Product.findOne({
        where: { id: item.productId, isDeleted: false },
        transaction: t,
      });
      if (!product) {
        throw new Error(`Product not found or has been deleted: ${item.productId}`);
      }

      const dispensary = await Dispensary.findOne({
        where: { productId: item.productId, isDeleted: false, isActive: true },
        transaction: t,
      });
      if (!dispensary) {
        throw new Error(`Product ${product.name} is not available in dispensary`);
      }

      if (dispensary.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${dispensary.quantity}`);
      }

      if (new Date(product.expiryDate) < new Date()) {
        throw new Error(`Product expired: ${product.name} (Batch: ${product.batchNo})`);
      }

      const saleAmount = product.sellingPrice * item.quantity;
      const profit = (product.sellingPrice - product.unitPrice) * item.quantity;

      preparedItems.push({
        productId: product.id,
        name: product.name,
        brand: product.brand,
        quantity: item.quantity,
        saleAmount,
        profit,
        dosageForm: product.DosageForms,
        unitPrice: product.unitPrice,
        sellingPrice: product.sellingPrice,
      });
      grandTotal += saleAmount;
    }

    if (amountPaid > grandTotal) {
      throw new Error("Amount paid cannot exceed total sale amount");
    }

    const remainingBalance = grandTotal - amountPaid;
    const paymentStatus =
      amountPaid > 0 ? (amountPaid === grandTotal ? "paid" : "partial") : "credit";

    const salesRecords = [];
    for (const item of preparedItems) {
      const itemAmountPaid = amountPaid > 0 ? (item.saleAmount / grandTotal) * amountPaid : 0;
      const itemRemainingBalance = item.saleAmount - itemAmountPaid;

      const saleRecord = await Sales.create(
        {
          transactionId,
          productId: item.productId,
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
          status: "completed",
          saleType: "credit",
          paymentStatus: itemRemainingBalance > 0 ? (itemAmountPaid > 0 ? "partial" : "credit") : "paid",
          amountPaid: itemAmountPaid,
          remainingBalance: itemRemainingBalance,
          dueDate: calculatedDueDate,
          creditApprovedBy: pharmacistId,
          creditApprovedAt: new Date(),
          paymentHistory:
            amountPaid > 0
              ? [
                  {
                    amount: itemAmountPaid,
                    paymentDate: new Date(),
                    paymentMethod: "cash",
                    receivedBy: pharmacistId,
                    notes: "Initial partial payment",
                  },
                ]
              : [],
          pharmacistId,
          cashierId: pharmacistId,
          completedAt: new Date(),
          timestamp,
        },
        { transaction: t }
      );

      // Deduct stock
      await Dispensary.decrement({ quantity: item.quantity }, { where: { productId: item.productId }, transaction: t });
      await Product.decrement({ quantity: item.quantity }, { where: { id: item.productId }, transaction: t });

      salesRecords.push(saleRecord.toJSON());
    }

    await t.commit();

    for (const item of preparedItems) {
      await Dispensary.updateStatus(item.productId);
    }

    const totalProfit = preparedItems.reduce((sum, item) => sum + item.profit, 0);
    updateProfitSummary(totalProfit, new Date());

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
      message: `Credit sale created successfully. ${
        amountPaid > 0 ? `Partial payment of ${amountPaid} received.` : "No initial payment received."
      }`,
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

export const ProcessCreditPayment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { transactionId, paymentAmount, paymentMethod = "cash", notes } = req.body;
    const userId = req.user.id || req.user._id;

    if (!transactionId || !paymentAmount || paymentAmount <= 0) {
      throw new Error("Valid transaction ID and payment amount are required");
    }

    const salesRecords = await Sales.findAll({
      where: {
        transactionId,
        saleType: "credit",
        paymentStatus: { [Op.in]: ["partial", "credit"] },
      },
      transaction: t,
    });

    if (salesRecords.length === 0) {
      throw new Error("No credit sales found for this transaction");
    }

    const totalRemainingBalance = salesRecords.reduce((sum, record) => sum + record.remainingBalance, 0);

    if (paymentAmount > totalRemainingBalance) {
      throw new Error(`Payment amount exceeds remaining balance. Maximum: ${totalRemainingBalance} ETB`);
    }

    const paymentRecords = [];
    let remainingPayment = paymentAmount;
    const totalBalance = totalRemainingBalance;

    for (let i = 0; i < salesRecords.length && remainingPayment > 0; i++) {
      const record = salesRecords[i];
      const recordProportion = record.remainingBalance / totalBalance;
      let paymentForThisRecord = paymentAmount * recordProportion;

      paymentForThisRecord = Math.min(paymentForThisRecord, record.remainingBalance);
      paymentForThisRecord = Math.min(paymentForThisRecord, remainingPayment);

      if (paymentForThisRecord <= 0) continue;

      record.amountPaid = Number((record.amountPaid + paymentForThisRecord).toFixed(2));
      record.remainingBalance = Number((record.remainingBalance - paymentForThisRecord).toFixed(2));
      record.paymentStatus = record.remainingBalance <= 0.01 ? "paid" : "partial";
      record.lastPaymentDate = new Date();

      const hist = Array.isArray(record.paymentHistory) ? [...record.paymentHistory] : [];
      hist.push({
        amount: paymentForThisRecord,
        paymentDate: new Date(),
        paymentMethod,
        receivedBy: userId,
        notes,
      });
      record.paymentHistory = hist;

      await record.save({ transaction: t });

      paymentRecords.push({
        product: record.name,
        amount: paymentForThisRecord,
        remainingBalance: record.remainingBalance,
        paymentStatus: record.paymentStatus,
      });

      remainingPayment = Number((remainingPayment - paymentForThisRecord).toFixed(2));
    }

    await t.commit();

    const allRecords = await Sales.findAll({ where: { transactionId } });
    const newTotalBalance = allRecords.reduce((sum, r) => sum + r.remainingBalance, 0);
    const paidRecords = allRecords.filter((r) => r.paymentStatus === "paid").length;
    const totalRecords = allRecords.length;
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
      details: `${paidRecords}/${totalRecords} items fully paid`,
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

export const GetCreditSales = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { paymentStatus, customerPhone, search, overdue, startDate, endDate } = req.query;

    const where = { saleType: "credit", status: "completed" };
    if (customerPhone) where.customerPhone = customerPhone;
    if (search) where.patientName = { [Op.like]: searchLike(search) };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp[Op.gte] = new Date(startDate);
      if (endDate) where.timestamp[Op.lte] = new Date(endDate);
    }

    const postGroupMatch = {};
    if (paymentStatus) postGroupMatch.paymentStatus = paymentStatus;
    if (overdue === "true") postGroupMatch.isOverdue = true;

    const result = await findTransactions({ where, postGroupMatch, page, limit, skip });
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const ConfirmSale = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { transactionId } = req.params;
    const cashierId = req.user.id || req.user._id;

    const salesRecords = await Sales.findAll({
      where: { transactionId, status: "pending" },
      transaction: t,
    });

    if (!salesRecords.length) {
      throw new Error("No pending transactions found");
    }

    const productIds = [...new Set(salesRecords.map((r) => r.productId))];
    const productDocs = await Product.findAll({
      where: { id: { [Op.in]: productIds } },
      attributes: ["id", "name", "expiryDate"],
      transaction: t,
    });
    const productMap = new Map(productDocs.map((p) => [p.id, p]));

    const now = new Date();
    let currentProfit = 0;

    for (const record of salesRecords) {
      await Dispensary.decrement(
        { quantity: record.quantitySold },
        { where: { productId: record.productId }, transaction: t }
      );
      await Product.decrement(
        { quantity: record.quantitySold },
        { where: { id: record.productId }, transaction: t }
      );

      record.status = "completed";
      record.cashierId = cashierId;
      currentProfit += record.profit;
      record.completedAt = now;
      await record.save({ transaction: t });
    }

    await t.commit();

    for (const record of salesRecords) {
      const product = productMap.get(record.productId);
      if (product && new Date(product.expiryDate) <= now) {
        await Notification.findOrCreate({
          where: { productId: product.id, type: "Expired", location: "dispensary", read: false },
          defaults: {
            productId: product.id,
            type: "Expired",
            location: "dispensary",
            message: `Sold expired product: ${product.name}`,
            read: false,
          },
        });
      }
      await Dispensary.updateStatus(record.productId);
    }

    updateProfitSummary(currentProfit, now);

    res.json({
      success: true,
      transactionId,
      completedAt: now,
      itemsCount: salesRecords.length,
    });
  } catch (error) {
    await t.rollback();
    res.status(400).json({ success: false, error: `Sale failed: ${error.message}` });
  }
};

export const AbortSale = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { transactionId } = req.params;
    const cashierId = req.user.id || req.user._id;

    const salesRecords = await Sales.findAll({
      where: { transactionId, status: "pending" },
      transaction: t,
    });

    if (!salesRecords.length) {
      throw new Error("No pending transactions found");
    }

    const now = new Date();
    for (const record of salesRecords) {
      record.status = "aborted";
      record.abortedAt = now;
      record.cashierId = cashierId;
      await record.save({ transaction: t });
    }

    await t.commit();
    res.json({
      success: true,
      transactionId,
      abortedAt: now,
      itemsCount: salesRecords.length,
    });
  } catch (error) {
    await t.rollback();
    res.status(400).json({ success: false, error: `Sale abort failed: ${error.message}` });
  }
};

export const CloseDailyBalance = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { cashierId, countedAmount, date } = req.body;
    if (!cashierId || countedAmount === undefined || countedAmount === null) {
      return res.status(400).json({
        success: false,
        error: "Cashier ID and counted amount are required",
      });
    }

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const cashier = await User.findByPk(cashierId, { transaction: t });
    if (!cashier) throw new Error("Cashier not found");
    if (cashier.status === "suspended") throw new Error("Cannot close balance for suspended cashier");

    const existingBalance = await DailyBalance.findOne({
      where: {
        cashier: cashierId,
        date: { [Op.gte]: targetDate, [Op.lt]: nextDay },
      },
      transaction: t,
    });
    if (existingBalance) {
      throw new Error("Daily balance already closed for this date");
    }

    const sales = await Sales.findAll({
      where: {
        status: "completed",
        cashierId,
        completedAt: { [Op.gte]: targetDate, [Op.lt]: nextDay },
      },
      transaction: t,
    });

    const expectedAmount = sales.reduce((sum, s) => sum + s.saleAmount, 0);
    const transactionIds = sales.map((s) => s.id);
    const difference = countedAmount - expectedAmount;

    const dailyBalance = await DailyBalance.create(
      {
        date: targetDate,
        expectedAmount,
        countedAmount: Number.parseFloat(countedAmount),
        difference,
        status: difference === 0 ? "verified" : "discrepancy",
        transactions: transactionIds,
        cashier: cashierId,
        closedBy: req.user.id || req.user._id,
        closedAt: new Date(),
        discrepancyNote:
          difference !== 0
            ? `Expected: $${expectedAmount}, Counted: $${countedAmount}, Difference: $${difference}`
            : null,
      },
      { transaction: t }
    );

    await t.commit();
    res.status(200).json({
      success: true,
      dailyBalance: dailyBalance.toJSON(),
      transactionCount: transactionIds.length,
      expectedAmount,
      countedAmount: Number.parseFloat(countedAmount),
      difference,
      status: difference === 0 ? "verified" : "discrepancy",
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

export const GetDailyTransactions = async (req, res) => {
  try {
    const { cashierId } = req.params;
    const { date } = req.query;
    const { page, limit, skip } = getPagination(req.query);

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const where = {
      status: "completed",
      cashierId,
      completedAt: { [Op.gte]: targetDate, [Op.lt]: nextDay },
    };

    const [{ rows: transactions, count: total }, allMatching] = await Promise.all([
      Sales.findAndCountAll({
        where,
        order: [["completedAt", "DESC"]],
        offset: skip,
        limit,
        include: [{ model: User, as: "pharmacistUser", attributes: ["name"] }],
      }),
      Sales.findAll({ where, attributes: ["saleAmount"] }),
    ]);

    const expectedAmount = allMatching.reduce((sum, s) => sum + s.saleAmount, 0);

    res.status(200).json({
      ...paginated(
        transactions.map((t) => ({
          id: t.id,
          _id: t.id,
          transactionId: t.transactionId,
          productName: t.name,
          brand: t.brand,
          quantity: t.quantitySold,
          saleAmount: t.saleAmount,
          profit: t.profit,
          completedAt: t.completedAt,
          pharmacist: t.pharmacistUser?.name,
        })),
        { page, limit, total }
      ),
      cashierId,
      date: targetDate,
      expectedAmount,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const GetAllCashiers = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const where = { role: "cashier" };

    const { rows: cashiers, count: total } = await User.findAndCountAll({
      where,
      attributes: ["id", "name", "email", "role", "status", "createdAt"],
      order: [["name", "ASC"]],
      offset: skip,
      limit,
    });

    res.status(200).json(paginated(cashiers, { page, limit, total }));
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const SuspendCashier = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { cashierId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id || req.user._id;

    const cashier = await User.findByPk(cashierId, { transaction: t });
    if (!cashier) throw new Error("Cashier not found");
    if (cashier.role !== "cashier") throw new Error("User is not a cashier");
    if (cashier.status === "suspended") throw new Error("Cashier is already suspended");

    cashier.status = "suspended";
    cashier.suspendedBy = adminId;
    await cashier.save({ transaction: t });

    await Notification.create(
      {
        type: "OutOfStock",
        message: `Cashier ${cashier.name} has been suspended due to: ${reason || "Daily balance discrepancy"}`,
        productId: 0,
        location: "store",
        read: false,
      },
      { transaction: t }
    );

    await t.commit();
    res.status(200).json({
      success: true,
      message: "Cashier suspended successfully",
      cashier: cashier.toJSON(),
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

export const GetDailyBalanceHistory = async (req, res) => {
  try {
    const { startDate, endDate, cashierId, status } = req.query;
    const { page, limit, skip } = getPagination(req.query);

    const where = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date[Op.gte] = new Date(startDate);
      if (endDate) where.date[Op.lte] = new Date(endDate);
    }
    if (cashierId) where.cashier = cashierId;
    if (status) where.status = status;

    const { rows: balances, count: total } = await DailyBalance.findAndCountAll({
      where,
      include: [
        { model: User, as: "cashierUser", attributes: ["id", "name", "email"] },
        { model: User, as: "closer", attributes: ["id", "name", "email"] },
      ],
      order: [["date", "DESC"]],
      offset: skip,
      limit,
    });

    const data = balances.map((b) => {
      const json = b.toJSON();
      return {
        id: json.id,
        _id: json.id,
        date: json.date,
        cashier: json.cashierUser,
        expectedAmount: json.expectedAmount,
        countedAmount: json.countedAmount,
        difference: json.difference,
        status: json.status,
        transactionCount: Array.isArray(json.transactions) ? json.transactions.length : 0,
        discrepancyNote: json.discrepancyNote,
        closedBy: json.closer,
        closedAt: json.closedAt,
      };
    });

    res.status(200).json(paginated(data, { page, limit, total }));
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export async function GetAllPendingStatus(req, res) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search } = req.query;

    const where = { status: "pending" };
    if (search) where.patientName = { [Op.like]: searchLike(search) };

    const result = await findTransactions({ where, page, limit, skip });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function GetAbortAndComplatedSale(req, res) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const {
      status,
      saleType,
      paymentStatus,
      customerPhone,
      search,
      pharmacist,
      cashier,
      startDate,
      endDate,
    } = req.query;

    const where = {
      status: status ? status : { [Op.in]: ["completed", "aborted", "refunded"] },
    };
    if (saleType) where.saleType = saleType;
    if (customerPhone) where.customerPhone = { [Op.like]: searchLike(customerPhone) };
    if (search) where.patientName = { [Op.like]: searchLike(search) };
    if (pharmacist) where.pharmacistId = pharmacist;
    if (cashier) where.cashierId = cashier;

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp[Op.gte] = new Date(startDate);
      if (endDate) where.timestamp[Op.lte] = new Date(endDate);
    }

    const postGroupMatch = paymentStatus ? { paymentStatus } : null;

    const result = await findTransactions({ where, postGroupMatch, page, limit, skip });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export const GetRecentSales = async (req, res) => {
  try {
    const { limit } = getPagination(req.query, { defaultLimit: 7, maxLimit: 50 });

    const recentSales = await Sales.findAll({
      where: { status: "completed" },
      order: [["completedAt", "DESC"]],
      limit,
      attributes: ["name", "brand", "saleAmount", "profit", "completedAt"],
    });

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
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to fetch recent sales: ${error.message}`,
    });
  }
};

export const GetTotalSales = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = { status: "completed" };

    if (startDate || endDate) {
      where.completedAt = {};
      if (startDate) where.completedAt[Op.gte] = new Date(startDate);
      if (endDate) where.completedAt[Op.lte] = new Date(endDate);
    }

    const allCompleted = await Sales.findAll({
      where,
      attributes: ["transactionId", "saleAmount", "profit"],
    });

    const uniqueTxIds = new Set();
    let totalSales = 0;
    let totalProfit = 0;
    for (const item of allCompleted) {
      totalSales += item.saleAmount || 0;
      totalProfit += item.profit || 0;
      if (item.transactionId) uniqueTxIds.add(item.transactionId);
    }

    res.status(200).json({
      totalSales: Math.round(totalSales * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      transactionCount: uniqueTxIds.size,
      itemCount: allCompleted.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const UndoSale = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { transactionId, productId } = req.body;
    const userId = req.user.id || req.user._id;

    const where = { transactionId, status: "completed" };
    if (productId) {
      where.productId = productId;
    } else {
      where.saleType = "credit";
    }

    const salesRecords = await Sales.findAll({ where, transaction: t });
    if (salesRecords.length === 0) {
      throw new Error("Sales record(s) not found");
    }

    const transferIds = [];
    for (const record of salesRecords) {
      const prodId = record.productId;
      const product = await Product.findByPk(prodId, { transaction: t });
      if (!product) throw new Error(`Product not found: ${prodId}`);

      await Dispensary.increment({ quantity: record.quantitySold }, { where: { productId: prodId }, transaction: t });
      await Product.increment({ quantity: record.quantitySold }, { where: { id: prodId }, transaction: t });

      if (record.saleType === "credit") {
        record.paymentStatus = "credit";
        record.amountPaid = 0;
        record.remainingBalance = record.saleAmount;
        record.paymentHistory = [];
        record.lastPaymentDate = null;
      }

      const disp = await Dispensary.findOne({ where: { productId: prodId }, transaction: t });

      const transfer = await Transfare.create(
        {
          productId: prodId,
          userId,
          type: record.saleType === "credit" ? "CREDIT_REFUND" : "RETURN_REFUND",
          quantity: record.quantitySold,
          quantityLeft: disp ? disp.quantity + record.quantitySold : record.quantitySold,
          totalQuantity: product.quantity + record.quantitySold,
          issuedPrice: record.saleAmount / record.quantitySold,
          unitPrice: product.unitPrice,
          totalIssuedPrice: record.saleAmount,
          totalUnitPrice: product.unitPrice * record.quantitySold,
          date: new Date(),
          notes: `Undo ${record.saleType === "credit" ? "credit" : "regular"} sale - Transaction: ${transactionId}`,
        },
        { transaction: t }
      );
      transferIds.push(transfer.id);

      record.status = "refunded";
      record.refundedAt = new Date();
      record.refundedBy = userId;
      await record.save({ transaction: t });
    }

    await t.commit();

    for (const record of salesRecords) {
      await Dispensary.updateStatus(record.productId);
    }

    res.json({
      success: true,
      message:
        salesRecords.length > 1
          ? "Credit transaction undone successfully"
          : "Transaction undone successfully",
      transactionId,
      refundedItems: salesRecords.length,
      transferIds,
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};