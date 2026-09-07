// inventoryController.js
import mongoose from "mongoose";
import Product from "../models/ProductModel.js";
import Store from "../models/StoreModel.js";
import Dispensary from "../models/DispensaryModel.js";
import Transfare from "../models/Transfer.js";
import Sales from "../models/SalesModel.js";
import { getPagination, paginated, searchRegex } from "../utils/pagination.js";

// Get current inventory status for a specific product
export async function GetProductInventory(req, res) {
  try {
    const productId = req.params.id;

    const product = await Product.findById(productId,
      { _id: 1, name: 1, batchNo: 1, expiryDate: 1, quantity: 1 }
    ).lean();
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Fetch inventory state + all history IN PARALLEL
    const [store, dispensary, recentTransfers, recentSales] = await Promise.all([
      Store.findOne({ product: productId, isDeleted: { $ne: true } },
        { quantity: 1 }).lean(),
      Dispensary.findOne({ product: productId, isDeleted: { $ne: true } },
        { quantity: 1 }).lean(),
      // All transfer types in one query — split by type in JS
      Transfare.find({ product: productId })
        .sort({ date: -1 })
        .limit(10)
        .populate("user", "name")
        .lean(),
      Sales.find({ product: productId, status: "completed" })
        .sort({ completedAt: -1 })
        .limit(10)
        .populate("pharmacist", "name")
        .populate("cashier", "name")
        .lean(),
    ]);

    // Split transfers in JS — no extra round-trips
    const recentUpdates = recentTransfers.filter((t) => t.type === "UPDATED_IN_DISPENSARY");
    const recentRefunds = recentTransfers.filter((t) => t.type === "RETURN_REFUND");

    const totalQuantityAdded = recentUpdates
      .filter((u) => u.UpdateType === "QUANTITY_ADDED")
      .reduce((sum, u) => sum + u.quantity, 0);
    const totalQuantityDeducted = recentUpdates
      .filter((u) => u.UpdateType === "QUANTITY_DEDUCTED")
      .reduce((sum, u) => sum + u.quantity, 0);

    res.json({
      product,
      inventory: {
        store: store ? store.quantity : 0,
        dispensary: dispensary ? dispensary.quantity : 0,
        total: product.quantity,
        totalQuantityAdded,
        totalQuantityDeducted,
      },
      recentTransfers,
      recentSales,
      recentUpdates,
      recentRefunds,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
export async function CalculateDispensaryInventory(req, res) {
  try {
    const productId = req.params.id;
    const { startDate, endDate } = req.query;

    const product = await Product.findById(productId, {
      _id: 1, name: 1, batchNo: 1, unitPrice: 1, sellingPrice: 1, createdAt: 1
    }).lean();
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Build date filters
    let dateFilter = {};
    let salesDateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      salesDateFilter.timestamp = {};
      if (startDate) { dateFilter.date.$gte = new Date(startDate); salesDateFilter.timestamp.$gte = new Date(startDate); }
      if (endDate)   { dateFilter.date.$lte = new Date(endDate);   salesDateFilter.timestamp.$lte = new Date(endDate); }
    }

    // Movement totals are summed by MongoDB — the ledger for a busy product over a
    // wide date range can be thousands of rows and none of them are needed here.
    const productObjectId = new mongoose.Types.ObjectId(productId);
    const [dispensary, transferTotals, salesTotals] = await Promise.all([
      Dispensary.findOne({ product: productId, isDeleted: { $ne: true } },
        { quantity: 1, initialDispensaryQty: 1 }).lean(),
      Transfare.aggregate([
        {
          $match: {
            product: productObjectId,
            type: { $in: ["ISSUE_TO_DISPENSARY", "RETURN_TO_STORE", "UPDATED_IN_DISPENSARY"] },
            ...dateFilter,
          },
        },
        { $group: { _id: { type: "$type", updateType: "$UpdateType" }, quantity: { $sum: "$quantity" } } },
      ]),
      Sales.aggregate([
        {
          $match: {
            product: productObjectId,
            status: { $in: ["completed", "refunded"] },
            ...salesDateFilter,
          },
        },
        { $group: { _id: "$status", quantity: { $sum: "$quantitySold" } } },
      ]),
    ]);

    const transferSum = (type, updateType = null) =>
      transferTotals
        .filter((t) => t._id.type === type && (updateType === null || t._id.updateType === updateType))
        .reduce((sum, t) => sum + t.quantity, 0);
    const salesSum = (status) => salesTotals.find((s) => s._id === status)?.quantity || 0;

    // Determine initial quantity
    const productCreatedAt = product.createdAt;
    let initialDispensaryQty = dispensary ? dispensary.initialDispensaryQty : 0;
    if (
      (startDate && productCreatedAt <= new Date(startDate)) ||
      (endDate && productCreatedAt >= new Date(endDate))
    ) {
      initialDispensaryQty = 0;
    }

    const totalIssuedInPeriod           = transferSum("ISSUE_TO_DISPENSARY");
    const totalReturnedInPeriod         = transferSum("RETURN_TO_STORE");
    const totalSoldInPeriod             = salesSum("completed");
    const totalQuantityAddedInPeriod    = transferSum("UPDATED_IN_DISPENSARY", "QUANTITY_ADDED");
    const totalQuantityDeductedInPeriod = transferSum("UPDATED_IN_DISPENSARY", "QUANTITY_DEDUCTED");
    const totalNetUpdatesInPeriod       = totalQuantityAddedInPeriod - totalQuantityDeductedInPeriod;
    const totalRefundedInPeriod         = salesSum("refunded");

    const expectedDispensaryQty =
      (initialDispensaryQty || 0)
      + (totalIssuedInPeriod || 0)
      - (totalReturnedInPeriod || 0)
      - (totalSoldInPeriod || 0)
      + (totalNetUpdatesInPeriod || 0);

    const totalUnitPrice    = product.unitPrice * expectedDispensaryQty;
    const totalSellingPrice = product.sellingPrice * expectedDispensaryQty;
    const potentialProfit   = totalSellingPrice - totalUnitPrice;

    res.json({
      product: {
        id: product._id,
        name: product.name,
        batchNo: product.batchNo,
        unitPrice: product.unitPrice,
        sellingPrice: product.sellingPrice
      },
      calculations: {
        initialDispensaryQty,
        totalIssuedInPeriod,
        totalReturnedInPeriod,
        totalSoldInPeriod,
        totalNetUpdatesInPeriod,
        totalQuantityAddedInPeriod,
        totalQuantityDeductedInPeriod,
        totalRefundedInPeriod,
        expectedDispensaryQty,
        financials: { totalUnitPrice, totalSellingPrice, potentialProfit }
      },
      timePeriod: {
        startDate: startDate || "Beginning of records",
        endDate: endDate || "Current date"
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
// Get inventory adjustment history
export async function GetInventoryHistory(req, res) {
  try {
    const productId = req.params.id;
    const { limit: limitNum } = getPagination(req.query, { defaultLimit: 50 });

    const product = await Product.findById(productId, { _id: 1, name: 1, batchNo: 1 }).lean();
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Fetch all transfers and sales IN PARALLEL — cuts 4 sequential round-trips to 2 concurrent ones
    const [allTransfers, sales] = await Promise.all([
      Transfare.find({ product: productId })
        .sort({ date: -1 })
        .limit(limitNum)
        .populate("user", "name")
        .lean(),
      Sales.find({ product: productId, status: "completed" })
        .sort({ completedAt: -1 })
        .limit(limitNum)
        .populate("pharmacist", "name")
        .populate("cashier", "name")
        .lean(),
    ]);

    // Split transfers by type in JS — no extra DB call needed
    const updates = allTransfers.filter((t) => t.type === "UPDATED_IN_DISPENSARY");

    // Combine and sort all events
    const allEvents = [
      ...allTransfers.map((t) => ({
        type: "TRANSFER",
        date: t.date,
        action:
          t.type === "ISSUE_TO_DISPENSARY" ? "ISSUE_TO_DISPENSARY"
          : t.type === "RETURN_TO_STORE" ? "RETURN_TO_STORE"
          : t.type,
        quantity: t.quantity,
        user: t.user?.name,
        details: t,
      })),
      ...updates.map((u) => ({
        type: "UPDATE",
        date: u.date,
        action: u.UpdateType,
        quantity: u.quantity,
        user: u.user?.name,
        details: u,
      })),
      ...sales.map((s) => ({
        type: "SALE",
        date: s.completedAt,
        action: "SALE",
        quantity: s.quantitySold,
        user: s.cashier ? s.cashier.name : (s.pharmacist ? s.pharmacist.name : "Unknown"),
        details: s,
      })),
    ].sort((a, b) => b.date - a.date);

    res.json({
      product,
      history: allEvents.slice(0, limitNum),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Reconcile inventory discrepancies
export async function ReconcileInventory(req, res) {
  try {
    const productId = req.params.id;
    const { adjustmentQty, reason, location } = req.body;
    const userId = req.user._id;
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    let quantityLeft;

    if (location === "store") {
      const store = await Store.findOne({ product: productId });
      if (!store) {
        return res.status(404).json({ message: "Store record not found" });
      }
      
      store.quantity += adjustmentQty;
      await store.save();
      quantityLeft = store.quantity; // already have this — no re-query needed

      // Update product total quantity using already-loaded dispensary
      const dispensary = await Dispensary.findOne({ product: productId }).lean();
      product.quantity = store.quantity + (dispensary ? dispensary.quantity : 0);
      await product.save();

    } else if (location === "dispensary") {
      const dispensary = await Dispensary.findOne({ product: productId });
      if (!dispensary) {
        return res.status(404).json({ message: "Dispensary record not found" });
      }
      
      dispensary.quantity += adjustmentQty;
      await dispensary.save();
      quantityLeft = dispensary.quantity; // already have this — no re-query needed

      // Update product total quantity using already-loaded store
      const store = await Store.findOne({ product: productId }).lean();
      product.quantity = (store ? store.quantity : 0) + dispensary.quantity;
      await product.save();
    } else {
      return res.status(400).json({ message: "Invalid location. Use 'store' or 'dispensary'" });
    }
    
    // Create adjustment record — quantityLeft is already in scope, no extra DB call
    const adjustment = new Transfare({
      product: productId,
      user: userId,
      type: "INVENTORY_ADJUSTMENT",
      quantity: adjustmentQty,
      quantityLeft,
      totalQuantity: product.quantity,
      adjustmentReason: reason
    });
    
    await adjustment.save();
    
    res.json({
      message: "Inventory reconciled successfully",
      adjustment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * Dispensary valuation report.
 *
 * The page of rows and the shelf-wide totals are produced by one aggregation.
 * Totals are computed over the whole filtered set (via $facet), not just the page,
 * so paginating doesn't silently change the reported valuation.
 */
export async function GetDispensarySummary(req, res) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, status } = req.query;

    const pipeline = [
      { $match: { isDeleted: { $ne: true }, isActive: true } },
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "product",
          pipeline: [
            { $match: { isDeleted: { $ne: true } } },
            { $project: { name: 1, brand: 1, expiryDate: 1, type: 1, DosageForms: 1, unitPrice: 1, sellingPrice: 1 } },
          ],
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          _id: 0,
          productId: "$product._id",
          name: "$product.name",
          brand: "$product.brand",
          status: "$status",
          expiryDate: "$product.expiryDate",
          type: "$product.type",
          dosageForm: "$product.DosageForms",
          quantity: "$quantity",
          unitPrice: "$product.unitPrice",
          sellingPrice: "$product.sellingPrice",
          productUnitPrice: { $multiply: ["$product.unitPrice", "$quantity"] },
          productSellingPrice: { $multiply: ["$product.sellingPrice", "$quantity"] },
        },
      },
    ];

    if (search) {
      const rx = searchRegex(search);
      pipeline.push({ $match: { $or: [{ name: rx }, { brand: rx }, { type: rx }] } });
    }
    if (status) pipeline.push({ $match: { status } });

    pipeline.push({
      $facet: {
        data: [{ $sort: { name: 1 } }, { $skip: skip }, { $limit: limit }],
        meta: [{ $count: "total" }],
        totals: [
          {
            $group: {
              _id: null,
              totalUnitPrice: { $sum: "$productUnitPrice" },
              totalSellingPrice: { $sum: "$productSellingPrice" },
            },
          },
        ],
      },
    });

    const [result] = await Dispensary.aggregate(pipeline);
    const totals = result?.totals?.[0] || { totalUnitPrice: 0, totalSellingPrice: 0 };

    res.json({
      ...paginated(result?.data || [], { page, limit, total: result?.meta?.[0]?.total || 0 }),
      totals: {
        totalUnitPrice: totals.totalUnitPrice,
        totalSellingPrice: totals.totalSellingPrice,
        potentialProfit: totals.totalSellingPrice - totals.totalUnitPrice,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}