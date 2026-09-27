import { Op, fn, col } from "sequelize";
import Product from "../models/ProductModel.js";
import Store from "../models/StoreModel.js";
import Dispensary from "../models/DispensaryModel.js";
import Transfare from "../models/Transfer.js";
import Sales from "../models/SalesModel.js";
import User from "../models/UserModel.js";
import { getPagination, paginated, searchLike } from "../utils/pagination.js";

// Get current inventory status for a specific product
export async function GetProductInventory(req, res) {
  try {
    const productId = req.params.id;

    const product = await Product.findByPk(productId, {
      attributes: ["id", "name", "batchNo", "expiryDate", "quantity"],
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const [store, dispensary, recentTransfers, recentSales] = await Promise.all([
      Store.findOne({ where: { productId, isDeleted: false }, attributes: ["quantity"] }),
      Dispensary.findOne({ where: { productId, isDeleted: false }, attributes: ["quantity"] }),
      Transfare.findAll({
        where: { productId },
        order: [["date", "DESC"]],
        limit: 10,
        include: [{ model: User, as: "userDetails", attributes: ["name"] }],
      }),
      Sales.findAll({
        where: { productId, status: "completed" },
        order: [["completedAt", "DESC"]],
        limit: 10,
        include: [
          { model: User, as: "pharmacistUser", attributes: ["name"] },
          { model: User, as: "cashierUser", attributes: ["name"] },
        ],
      }),
    ]);

    const transfersJson = recentTransfers.map((t) => {
      const json = t.toJSON();
      if (json.userDetails) json.user = json.userDetails;
      return json;
    });

    const salesJson = recentSales.map((s) => {
      const json = s.toJSON();
      if (json.pharmacistUser) json.pharmacist = json.pharmacistUser;
      if (json.cashierUser) json.cashier = json.cashierUser;
      return json;
    });

    const recentUpdates = transfersJson.filter((t) => t.type === "UPDATED_IN_DISPENSARY");
    const recentRefunds = transfersJson.filter((t) => t.type === "RETURN_REFUND");

    const totalQuantityAdded = recentUpdates
      .filter((u) => u.UpdateType === "QUANTITY_ADDED")
      .reduce((sum, u) => sum + (u.quantity || 0), 0);
    const totalQuantityDeducted = recentUpdates
      .filter((u) => u.UpdateType === "QUANTITY_DEDUCTED")
      .reduce((sum, u) => sum + (u.quantity || 0), 0);

    res.json({
      product: product.toJSON(),
      inventory: {
        store: store ? store.quantity : 0,
        dispensary: dispensary ? dispensary.quantity : 0,
        total: product.quantity,
        totalQuantityAdded,
        totalQuantityDeducted,
      },
      recentTransfers: transfersJson,
      recentSales: salesJson,
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

    const product = await Product.findByPk(productId, {
      attributes: ["id", "name", "brand", "batchNo", "unitPrice", "sellingPrice", "expiryDate", "createdAt"],
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : new Date();

    const dispensary = await Dispensary.findOne({
      where: { productId, isDeleted: false },
      attributes: ["quantity"],
    });
    const currentQty = dispensary ? parseFloat(dispensary.quantity) || 0 : 0;

    // Build query conditions
    const periodTransferWhere = { productId };
    const periodSalesWhere = { productId };
    if (start || end) {
      periodTransferWhere.date = {};
      periodSalesWhere.timestamp = {};
      if (start) {
        periodTransferWhere.date[Op.gte] = start;
        periodSalesWhere.timestamp[Op.gte] = start;
      }
      if (end) {
        periodTransferWhere.date[Op.lte] = end;
        periodSalesWhere.timestamp[Op.lte] = end;
      }
    }

    const afterTransferWhere = { productId, date: { [Op.gt]: end } };
    const afterSalesWhere = { productId, timestamp: { [Op.gt]: end } };

    const [periodTransfers, periodSales, afterTransfers, afterSales] = await Promise.all([
      Transfare.findAll({
        attributes: ["type", "UpdateType", "quantity"],
        where: periodTransferWhere,
        raw: true,
      }),
      Sales.findAll({
        attributes: ["status", "quantitySold"],
        where: {
          ...periodSalesWhere,
          status: { [Op.in]: ["completed", "credit", "partial", "refunded"] },
        },
        raw: true,
      }),
      Transfare.findAll({
        attributes: ["type", "UpdateType", "quantity"],
        where: afterTransferWhere,
        raw: true,
      }),
      Sales.findAll({
        attributes: ["status", "quantitySold"],
        where: {
          ...afterSalesWhere,
          status: { [Op.in]: ["completed", "credit", "partial", "refunded"] },
        },
        raw: true,
      }),
    ]);

    let periodIssued = 0,
      periodReturned = 0,
      periodAdded = 0,
      periodDeducted = 0,
      periodAdjusted = 0,
      periodSold = 0,
      periodRefunded = 0;
    let afterIssued = 0,
      afterReturned = 0,
      afterAdded = 0,
      afterDeducted = 0,
      afterAdjusted = 0,
      afterSold = 0,
      afterRefunded = 0;

    for (const t of periodTransfers) {
      const qty = parseFloat(t.quantity) || 0;
      if (t.type === "ISSUE_TO_DISPENSARY") periodIssued += qty;
      else if (t.type === "RETURN_TO_STORE") periodReturned += qty;
      else if (t.type === "UPDATED_IN_DISPENSARY") {
        if (t.UpdateType === "QUANTITY_ADDED") periodAdded += qty;
        else if (t.UpdateType === "QUANTITY_DEDUCTED") periodDeducted += qty;
      } else if (t.type === "INVENTORY_ADJUSTMENT") periodAdjusted += qty;
    }

    for (const s of periodSales) {
      const qty = parseFloat(s.quantitySold) || 0;
      if (s.status === "refunded") periodRefunded += qty;
      else periodSold += qty;
    }

    for (const t of afterTransfers) {
      const qty = parseFloat(t.quantity) || 0;
      if (t.type === "ISSUE_TO_DISPENSARY") afterIssued += qty;
      else if (t.type === "RETURN_TO_STORE") afterReturned += qty;
      else if (t.type === "UPDATED_IN_DISPENSARY") {
        if (t.UpdateType === "QUANTITY_ADDED") afterAdded += qty;
        else if (t.UpdateType === "QUANTITY_DEDUCTED") afterDeducted += qty;
      } else if (t.type === "INVENTORY_ADJUSTMENT") afterAdjusted += qty;
    }

    for (const s of afterSales) {
      const qty = parseFloat(s.quantitySold) || 0;
      if (s.status === "refunded") afterRefunded += qty;
      else afterSold += qty;
    }

    const closingStock = Math.max(
      0,
      currentQty -
        afterIssued +
        afterReturned +
        afterSold -
        afterRefunded -
        afterAdded +
        afterDeducted -
        afterAdjusted
    );

    const openingStock = Math.max(
      0,
      closingStock -
        periodIssued +
        periodReturned +
        periodSold -
        periodRefunded -
        periodAdded +
        periodDeducted -
        periodAdjusted
    );

    const expectedDispensaryQty = Math.max(
      0,
      openingStock +
        periodIssued -
        periodReturned -
        periodSold +
        periodRefunded +
        periodAdded -
        periodDeducted +
        periodAdjusted
    );

    const unitPrice = parseFloat(product.unitPrice) || 0;
    const sellingPrice = parseFloat(product.sellingPrice) || 0;

    const openingCostValuation = openingStock * unitPrice;
    const openingRetailValuation = openingStock * sellingPrice;
    const closingCostValuation = closingStock * unitPrice;
    const closingRetailValuation = closingStock * sellingPrice;
    const potentialProfit = closingRetailValuation - closingCostValuation;

    res.json({
      product: {
        id: product.id,
        _id: product.id,
        name: product.name,
        brand: product.brand,
        batchNo: product.batchNo,
        unitPrice,
        sellingPrice,
      },
      calculations: {
        openingStock,
        totalIssuedInPeriod: periodIssued,
        totalReturnedInPeriod: periodReturned,
        totalSoldInPeriod: periodSold,
        totalRefundedInPeriod: periodRefunded,
        totalQuantityAddedInPeriod: periodAdded,
        totalQuantityDeductedInPeriod: periodDeducted,
        totalAdjustedInPeriod: periodAdjusted,
        expectedDispensaryQty,
        closingStock,
        currentStock: currentQty,
        variance: currentQty - expectedDispensaryQty,
        financials: {
          openingCostValuation,
          openingRetailValuation,
          closingCostValuation,
          closingRetailValuation,
          potentialProfit,
        },
      },
      timePeriod: {
        startDate: startDate || "Beginning of records",
        endDate: endDate || "Current date",
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function GetDispensaryLedger(req, res) {
  try {
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 25 });
    const { search, startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : new Date();

    const productWhere = {
      [Op.or]: [{ isDeleted: false }, { isDeleted: null }],
    };
    if (search) {
      const rx = searchLike(search);
      productWhere[Op.and] = [
        {
          [Op.or]: [
            { name: { [Op.like]: rx } },
            { brand: { [Op.like]: rx } },
            { batchNo: { [Op.like]: rx } },
          ],
        },
      ];
    }

    const allProducts = await Product.findAll({
      where: productWhere,
      attributes: ["id", "name", "brand", "batchNo", "unitPrice", "sellingPrice", "expiryDate", "createdAt"],
      include: [
        {
          model: Dispensary,
          as: "dispensary",
          required: false,
          attributes: ["quantity", "isDeleted", "isActive"],
        },
      ],
    });

    const productIds = allProducts.map((p) => p.id);

    if (productIds.length === 0) {
      return res.json({
        ...paginated([], { page, limit, total: 0 }),
        summary: {
          openingStockQty: 0,
          totalIssuedQty: 0,
          totalReturnedQty: 0,
          totalSoldQty: 0,
          totalRefundedQty: 0,
          totalAddedQty: 0,
          totalDeductedQty: 0,
          closingStockQty: 0,
          openingCostValuation: 0,
          openingRetailValuation: 0,
          closingCostValuation: 0,
          closingRetailValuation: 0,
          potentialProfit: 0,
        },
      });
    }

    const periodTransferWhere = { productId: { [Op.in]: productIds } };
    const periodSalesWhere = { productId: { [Op.in]: productIds } };

    if (start || end) {
      periodTransferWhere.date = {};
      periodSalesWhere.timestamp = {};
      if (start) {
        periodTransferWhere.date[Op.gte] = start;
        periodSalesWhere.timestamp[Op.gte] = start;
      }
      if (end) {
        periodTransferWhere.date[Op.lte] = end;
        periodSalesWhere.timestamp[Op.lte] = end;
      }
    }

    const afterTransferWhere = {
      productId: { [Op.in]: productIds },
      date: { [Op.gt]: end },
    };
    const afterSalesWhere = {
      productId: { [Op.in]: productIds },
      timestamp: { [Op.gt]: end },
    };

    const [periodTransfers, periodSales, afterTransfers, afterSales] = await Promise.all([
      Transfare.findAll({
        attributes: ["productId", "type", "UpdateType", "quantity"],
        where: periodTransferWhere,
        raw: true,
      }),
      Sales.findAll({
        attributes: ["productId", "status", "quantitySold"],
        where: {
          ...periodSalesWhere,
          status: { [Op.in]: ["completed", "credit", "partial", "refunded"] },
        },
        raw: true,
      }),
      Transfare.findAll({
        attributes: ["productId", "type", "UpdateType", "quantity"],
        where: afterTransferWhere,
        raw: true,
      }),
      Sales.findAll({
        attributes: ["productId", "status", "quantitySold"],
        where: {
          ...afterSalesWhere,
          status: { [Op.in]: ["completed", "credit", "partial", "refunded"] },
        },
        raw: true,
      }),
    ]);

    const metricsMap = {};
    for (const pid of productIds) {
      metricsMap[pid] = {
        periodIssued: 0,
        periodReturned: 0,
        periodAdded: 0,
        periodDeducted: 0,
        periodAdjusted: 0,
        periodSold: 0,
        periodRefunded: 0,
        afterIssued: 0,
        afterReturned: 0,
        afterAdded: 0,
        afterDeducted: 0,
        afterAdjusted: 0,
        afterSold: 0,
        afterRefunded: 0,
      };
    }

    for (const t of periodTransfers) {
      const m = metricsMap[t.productId];
      if (!m) continue;
      const qty = parseFloat(t.quantity) || 0;
      if (t.type === "ISSUE_TO_DISPENSARY") m.periodIssued += qty;
      else if (t.type === "RETURN_TO_STORE") m.periodReturned += qty;
      else if (t.type === "UPDATED_IN_DISPENSARY") {
        if (t.UpdateType === "QUANTITY_ADDED") m.periodAdded += qty;
        else if (t.UpdateType === "QUANTITY_DEDUCTED") m.periodDeducted += qty;
      } else if (t.type === "INVENTORY_ADJUSTMENT") m.periodAdjusted += qty;
    }

    for (const s of periodSales) {
      const m = metricsMap[s.productId];
      if (!m) continue;
      const qty = parseFloat(s.quantitySold) || 0;
      if (s.status === "refunded") m.periodRefunded += qty;
      else m.periodSold += qty;
    }

    for (const t of afterTransfers) {
      const m = metricsMap[t.productId];
      if (!m) continue;
      const qty = parseFloat(t.quantity) || 0;
      if (t.type === "ISSUE_TO_DISPENSARY") m.afterIssued += qty;
      else if (t.type === "RETURN_TO_STORE") m.afterReturned += qty;
      else if (t.type === "UPDATED_IN_DISPENSARY") {
        if (t.UpdateType === "QUANTITY_ADDED") m.afterAdded += qty;
        else if (t.UpdateType === "QUANTITY_DEDUCTED") m.afterDeducted += qty;
      } else if (t.type === "INVENTORY_ADJUSTMENT") m.afterAdjusted += qty;
    }

    for (const s of afterSales) {
      const m = metricsMap[s.productId];
      if (!m) continue;
      const qty = parseFloat(s.quantitySold) || 0;
      if (s.status === "refunded") m.afterRefunded += qty;
      else m.afterSold += qty;
    }

    let storeSummary = {
      openingStockQty: 0,
      totalIssuedQty: 0,
      totalReturnedQty: 0,
      totalSoldQty: 0,
      totalRefundedQty: 0,
      totalAddedQty: 0,
      totalDeductedQty: 0,
      closingStockQty: 0,
      openingCostValuation: 0,
      openingRetailValuation: 0,
      closingCostValuation: 0,
      closingRetailValuation: 0,
      potentialProfit: 0,
    };

    // Calculate per-batch items from allProducts
    const batchCalculations = allProducts.map((p) => {
      const m = metricsMap[p.id] || {};
      const currentQty = (p.dispensary && !p.dispensary.isDeleted) ? (parseFloat(p.dispensary.quantity) || 0) : 0;
      const unitPrice = parseFloat(p.unitPrice) || 0;
      const sellingPrice = parseFloat(p.sellingPrice) || 0;

      const closingStock = Math.max(
        0,
        currentQty -
          m.afterIssued +
          m.afterReturned +
          m.afterSold -
          m.afterRefunded -
          m.afterAdded +
          m.afterDeducted -
          m.afterAdjusted
      );

      const openingStock = Math.max(
        0,
        closingStock -
          m.periodIssued +
          m.periodReturned +
          m.periodSold -
          m.periodRefunded -
          m.periodAdded +
          m.periodDeducted -
          m.periodAdjusted
      );

      const calculatedExpected = Math.max(
        0,
        openingStock +
          m.periodIssued -
          m.periodReturned -
          m.periodSold +
          m.periodRefunded +
          m.periodAdded -
          m.periodDeducted +
          m.periodAdjusted
      );

      storeSummary.openingStockQty += openingStock;
      storeSummary.totalIssuedQty += m.periodIssued;
      storeSummary.totalReturnedQty += m.periodReturned;
      storeSummary.totalSoldQty += m.periodSold;
      storeSummary.totalRefundedQty += m.periodRefunded;
      storeSummary.totalAddedQty += m.periodAdded;
      storeSummary.totalDeductedQty += m.periodDeducted;
      storeSummary.closingStockQty += closingStock;

      storeSummary.openingCostValuation += openingStock * unitPrice;
      storeSummary.openingRetailValuation += openingStock * sellingPrice;
      storeSummary.closingCostValuation += closingStock * unitPrice;
      storeSummary.closingRetailValuation += closingStock * sellingPrice;

      return {
        productId: p.id,
        name: p.name || "",
        brand: p.brand || "",
        batchNo: p.batchNo || "",
        unitPrice,
        sellingPrice,
        expiryDate: p.expiryDate,
        openingStock,
        issuedToDispensary: m.periodIssued,
        returnedToStore: m.periodReturned,
        sold: m.periodSold,
        refunded: m.periodRefunded,
        manualAdded: m.periodAdded,
        manualDeducted: m.periodDeducted,
        adjusted: m.periodAdjusted,
        closingStock,
        currentStock: currentQty,
        calculatedExpected,
        variance: currentQty - calculatedExpected,
        openingCostValue: openingStock * unitPrice,
        openingRetailValue: openingStock * sellingPrice,
        closingCostValue: closingStock * unitPrice,
        closingRetailValue: closingStock * sellingPrice,
      };
    });

    storeSummary.potentialProfit =
      storeSummary.closingRetailValuation - storeSummary.closingCostValuation;

    // Group batch calculations by product identity (name + brand)
    const groupedMap = new Map();

    for (const item of batchCalculations) {
      const key = `${item.name.trim().toLowerCase()}|${(item.brand || "").trim().toLowerCase()}`;

      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          groupId: key,
          productId: item.productId,
          productIds: [item.productId],
          name: item.name,
          brand: item.brand,
          unitPrice: item.unitPrice,
          sellingPrice: item.sellingPrice,
          openingStock: 0,
          issuedToDispensary: 0,
          returnedToStore: 0,
          sold: 0,
          refunded: 0,
          manualAdded: 0,
          manualDeducted: 0,
          adjusted: 0,
          closingStock: 0,
          currentStock: 0,
          calculatedExpected: 0,
          variance: 0,
          openingCostValue: 0,
          openingRetailValue: 0,
          closingCostValue: 0,
          closingRetailValue: 0,
          batches: [],
        });
      }

      const g = groupedMap.get(key);
      if (!g.productIds.includes(item.productId)) {
        g.productIds.push(item.productId);
      }

      g.openingStock += item.openingStock;
      g.issuedToDispensary += item.issuedToDispensary;
      g.returnedToStore += item.returnedToStore;
      g.sold += item.sold;
      g.refunded += item.refunded;
      g.manualAdded += item.manualAdded;
      g.manualDeducted += item.manualDeducted;
      g.adjusted += item.adjusted;
      g.closingStock += item.closingStock;
      g.currentStock += item.currentStock;
      g.calculatedExpected += item.calculatedExpected;
      g.variance += item.variance;

      g.openingCostValue += item.openingCostValue;
      g.openingRetailValue += item.openingRetailValue;
      g.closingCostValue += item.closingCostValue;
      g.closingRetailValue += item.closingRetailValue;

      g.batches.push({
        id: item.productId,
        batchNo: item.batchNo,
        expiryDate: item.expiryDate,
        quantity: item.currentStock,
        unitPrice: item.unitPrice,
        sellingPrice: item.sellingPrice,
      });
    }

    const groupedList = Array.from(groupedMap.values()).map((g) => ({
      ...g,
      _id: g.productId,
      batchCount: g.batches.length,
      potentialProfit: g.closingRetailValue - g.closingCostValue,
    }));

    const total = groupedList.length;
    const paginatedData = groupedList.slice(skip, skip + limit);

    res.json({
      ...paginated(paginatedData, { page, limit, total }),
      summary: storeSummary,
      timePeriod: {
        startDate: startDate || "Beginning of records",
        endDate: endDate || "Current date",
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function GetInventoryHistory(req, res) {
  try {
    const productId = req.params.id;
    const { limit: limitNum } = getPagination(req.query, { defaultLimit: 100 });
    const { productIds: rawProductIds } = req.query;

    let productIds = [productId];
    if (rawProductIds) {
      productIds = String(rawProductIds)
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
    }

    const products = await Product.findAll({
      where: { id: { [Op.in]: productIds } },
      attributes: ["id", "name", "brand", "batchNo"],
    });

    if (products.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const mainProduct = products[0];

    const [allTransfers, sales] = await Promise.all([
      Transfare.findAll({
        where: { productId: { [Op.in]: productIds } },
        order: [["date", "DESC"]],
        limit: limitNum,
        include: [{ model: User, as: "userDetails", attributes: ["name"] }],
      }),
      Sales.findAll({
        where: { productId: { [Op.in]: productIds }, status: { [Op.in]: ["completed", "credit", "partial", "refunded"] } },
        order: [["completedAt", "DESC"]],
        limit: limitNum,
        include: [
          { model: User, as: "pharmacistUser", attributes: ["name"] },
          { model: User, as: "cashierUser", attributes: ["name"] },
        ],
      }),
    ]);

    const updates = allTransfers.filter((t) => t.type === "UPDATED_IN_DISPENSARY");

    const batchMap = {};
    for (const p of products) {
      batchMap[p.id] = p.batchNo;
    }

    const allEvents = [
      ...allTransfers.map((t) => ({
        type: "TRANSFER",
        date: t.date,
        batchNo: batchMap[t.productId] || "N/A",
        action:
          t.type === "ISSUE_TO_DISPENSARY"
            ? "ISSUE_TO_DISPENSARY"
            : t.type === "RETURN_TO_STORE"
            ? "RETURN_TO_STORE"
            : t.type,
        quantity: t.quantity,
        user: t.userDetails?.name,
        details: t.toJSON(),
      })),
      ...updates.map((u) => ({
        type: "UPDATE",
        date: u.date,
        batchNo: batchMap[u.productId] || "N/A",
        action: u.UpdateType,
        quantity: u.quantity,
        user: u.userDetails?.name,
        details: u.toJSON(),
      })),
      ...sales.map((s) => ({
        type: "SALE",
        date: s.completedAt || s.timestamp,
        batchNo: batchMap[s.productId] || "N/A",
        action: s.status === "refunded" ? "REFUND" : "SALE",
        quantity: s.quantitySold,
        user: s.cashierUser ? s.cashierUser.name : s.pharmacistUser ? s.pharmacistUser.name : "Unknown",
        details: s.toJSON(),
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      product: mainProduct.toJSON(),
      allProducts: products.map((p) => p.toJSON()),
      history: allEvents.slice(0, limitNum),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function ReconcileInventory(req, res) {
  try {
    const productId = req.params.id;
    const { adjustmentQty, reason, location } = req.body;
    const userId = req.user.id || req.user._id;

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    let quantityLeft;

    if (location === "store") {
      const store = await Store.findOne({ where: { productId } });
      if (!store) {
        return res.status(404).json({ message: "Store record not found" });
      }

      store.quantity += adjustmentQty;
      await store.save();
      quantityLeft = store.quantity;

      const dispensary = await Dispensary.findOne({ where: { productId } });
      product.quantity = store.quantity + (dispensary ? dispensary.quantity : 0);
      await product.save();
    } else if (location === "dispensary") {
      const dispensary = await Dispensary.findOne({ where: { productId } });
      if (!dispensary) {
        return res.status(404).json({ message: "Dispensary record not found" });
      }

      dispensary.quantity += adjustmentQty;
      await dispensary.save();
      quantityLeft = dispensary.quantity;

      const store = await Store.findOne({ where: { productId } });
      product.quantity = (store ? store.quantity : 0) + dispensary.quantity;
      await product.save();
    } else {
      return res.status(400).json({ message: "Invalid location. Use 'store' or 'dispensary'" });
    }

    const adjustment = await Transfare.create({
      productId,
      userId,
      type: "INVENTORY_ADJUSTMENT",
      quantity: adjustmentQty,
      quantityLeft,
      totalQuantity: product.quantity,
      adjustmentReason: reason,
    });

    res.json({
      message: "Inventory reconciled successfully",
      adjustment: adjustment.toJSON(),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function GetDispensarySummary(req, res) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, status } = req.query;

    const where = { isDeleted: false, isActive: true };
    if (status) where.status = status;

    const productWhere = { isDeleted: false };
    if (search) {
      const rx = searchLike(search);
      productWhere[Op.or] = [
        { name: { [Op.like]: rx } },
        { brand: { [Op.like]: rx } },
        { type: { [Op.like]: rx } },
      ];
    }

    const { rows, count: total } = await Dispensary.findAndCountAll({
      where,
      include: [
        {
          model: Product,
          as: "productDetails",
          where: productWhere,
          attributes: ["id", "name", "brand", "expiryDate", "type", "DosageForms", "unitPrice", "sellingPrice"],
        },
      ],
      offset: skip,
      limit,
    });

    // Compute shelf-wide totals for all matching items
    const allMatching = await Dispensary.findAll({
      where,
      include: [
        {
          model: Product,
          as: "productDetails",
          where: productWhere,
          attributes: ["unitPrice", "sellingPrice"],
        },
      ],
    });

    let totalUnitPrice = 0;
    let totalSellingPrice = 0;
    for (const item of allMatching) {
      if (item.productDetails) {
        totalUnitPrice += (item.productDetails.unitPrice || 0) * (item.quantity || 0);
        totalSellingPrice += (item.productDetails.sellingPrice || 0) * (item.quantity || 0);
      }
    }

    const data = rows.map((item) => {
      const p = item.productDetails || {};
      const qty = item.quantity || 0;
      return {
        productId: p.id,
        _id: p.id,
        name: p.name,
        brand: p.brand,
        status: item.status,
        expiryDate: p.expiryDate,
        type: p.type,
        dosageForm: p.DosageForms,
        quantity: qty,
        unitPrice: p.unitPrice,
        sellingPrice: p.sellingPrice,
        productUnitPrice: (p.unitPrice || 0) * qty,
        productSellingPrice: (p.sellingPrice || 0) * qty,
      };
    });

    res.json({
      ...paginated(data, { page, limit, total }),
      totals: {
        totalUnitPrice,
        totalSellingPrice,
        potentialProfit: totalSellingPrice - totalUnitPrice,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function SubmitPhysicalReconciliation(req, res) {
  const t = await sequelize.transaction();
  try {
    const userId = req.user?.id || req.user?._id;
    const {
      location = "dispensary",
      reconciliationNotes = "",
      adjustSystemStock = true,
      items = [],
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items provided for physical count reconciliation" });
    }

    let balancedCount = 0;
    let shortageCount = 0;
    let overageCount = 0;
    let netQtyVariance = 0;
    let totalCostVariance = 0;
    let totalRetailVariance = 0;
    let adjustedProducts = 0;

    for (const item of items) {
      const {
        productId,
        productIds = [productId],
        expectedQty = 0,
        physicalCount = 0,
        unitPrice = 0,
        sellingPrice = 0,
        reason = "",
        notes = "",
      } = item;

      const physical = parseFloat(physicalCount) || 0;
      const expected = parseFloat(expectedQty) || 0;
      const variance = physical - expected;

      if (variance === 0) {
        balancedCount++;
        continue;
      }

      if (variance < 0) shortageCount++;
      else overageCount++;

      netQtyVariance += variance;
      totalCostVariance += variance * (parseFloat(unitPrice) || 0);
      totalRetailVariance += variance * (parseFloat(sellingPrice) || 0);

      if (adjustSystemStock) {
        const targets = await Product.findAll({
          where: { id: { [Op.in]: productIds } },
          transaction: t,
        });

        if (targets.length > 0) {
          const target = targets[0];
          const LocationModel = location === "store" ? Store : Dispensary;

          let locRecord = await LocationModel.findOne({
            where: { productId: target.id, [Op.or]: [{ isDeleted: false }, { isDeleted: null }, { isDeleted: 0 }] },
            transaction: t,
          });

          if (!locRecord) {
            locRecord = await LocationModel.create(
              {
                productId: target.id,
                quantity: 0,
                threshold: 10,
                isActive: true,
                isDeleted: false,
              },
              { transaction: t }
            );
          }

          const newLocQty = Math.max(0, (locRecord.quantity || 0) + variance);
          locRecord.quantity = newLocQty;
          await locRecord.save({ transaction: t });

          const otherLoc = location === "store" ? Dispensary : Store;
          const otherRecord = await otherLoc.findOne({
            where: { productId: target.id, [Op.or]: [{ isDeleted: false }, { isDeleted: null }, { isDeleted: 0 }] },
            transaction: t,
          });
          const otherQty = otherRecord ? otherRecord.quantity || 0 : 0;
          target.quantity = newLocQty + otherQty;
          await target.save({ transaction: t });

          await Transfare.create(
            {
              productId: target.id,
              userId,
              type: "INVENTORY_ADJUSTMENT",
              UpdateType: variance > 0 ? "QUANTITY_ADDED" : "QUANTITY_DEDUCTED",
              quantity: Math.abs(variance),
              quantityLeft: newLocQty,
              totalQuantity: target.quantity,
              issuedPrice: target.sellingPrice,
              unitPrice: target.unitPrice,
              totalIssuedPrice: (target.sellingPrice || 0) * Math.abs(variance),
              totalUnitPrice: (target.unitPrice || 0) * Math.abs(variance),
              notes: [reconciliationNotes, reason, notes].filter(Boolean).join(" - ") || "Physical Count Reconciliation",
            },
            { transaction: t }
          );

          if (location === "store") {
            await Store.updateStatus(target.id);
          } else {
            await Dispensary.updateStatus(target.id);
          }

          adjustedProducts++;
        }
      }
    }

    await t.commit();

    return res.json({
      success: true,
      message: `Physical count reconciliation completed successfully. ${adjustedProducts} product(s) stock adjusted.`,
      summary: {
        totalProductsInspected: items.length,
        balancedCount,
        shortageCount,
        overageCount,
        netQtyVariance,
        totalCostVariance: Math.round(totalCostVariance * 100) / 100,
        totalRetailVariance: Math.round(totalRetailVariance * 100) / 100,
        adjustedProducts,
      },
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ message: error.message });
  }
}