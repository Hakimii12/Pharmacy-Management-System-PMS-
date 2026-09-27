import { Op } from "sequelize";
import { sequelize } from "../database/database.js";
import Product from "../models/ProductModel.js";
import Dispensary from "../models/DispensaryModel.js";
import Store from "../models/StoreModel.js";
import Transfare from "../models/Transfer.js";
import Sales from "../models/SalesModel.js";
import User from "../models/UserModel.js";
import { calculateInterdependentPrices } from "../helper/calculateInterdependentPrices.js";
import { getPagination, paginated, searchLike } from "../utils/pagination.js";
import { syncExpiryNotificationsInBackground } from "../services/notificationService.js";
import { productIdentityKey } from "../utils/productIdentity.js";

async function getInventoryData(productId) {
  const store = await Store.findOne({ where: { productId, isDeleted: false } });
  const dispensary = await Dispensary.findOne({ where: { productId, isDeleted: false } });

  return {
    store: store && store.isActive ? store.quantity : 0,
    dispensary: dispensary && dispensary.isActive ? dispensary.quantity : 0,
    storeThreshold: store ? store.threshold : 10,
    dispensaryThreshold: dispensary ? dispensary.threshold : 10,
    storeActive: store ? store.isActive : false,
    dispensaryActive: dispensary ? dispensary.isActive : false,
    storeExists: Boolean(store),
    dispensaryExists: Boolean(dispensary),
    storeStatus: store ? store.status : "Sold Out",
    dispensaryStatus: dispensary ? dispensary.status : "Sold Out",
    storeIsExpired: store ? store.isExpired : false,
    dispensaryIsExpired: dispensary ? dispensary.isExpired : false,
  };
}

async function populateProductWithInventory(product) {
  if (!product) return null;
  const json = typeof product.toJSON === "function" ? product.toJSON() : product;
  const inventory = await getInventoryData(json.id || json._id);
  return { ...json, inventory };
}

function productListOptions(req) {
  const { page, limit, skip } = getPagination(req.query);
  const { search, category, status } = req.query;
  return { page, limit, skip, search, category, status };
}

async function queryProductsWithInventory({
  match = {},
  location = null,
  minQuantity = null,
  search,
  category,
  status,
  page = 1,
  limit = 25,
  skip = 0,
}) {
  const where = { ...match };
  if (category) where.category = category;
  if (search) {
    const rx = searchLike(search);
    where[Op.or] = [
      { name: { [Op.like]: rx } },
      { brand: { [Op.like]: rx } },
      { batchNo: { [Op.like]: rx } },
      { type: { [Op.like]: rx } },
    ];
  }

  const include = [
    { model: Store, as: "store", required: false },
    { model: Dispensary, as: "dispensary", required: false },
  ];

  const products = await Product.findAll({
    where,
    include,
    order: [["createdAt", "DESC"]],
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const identityStockMap = new Map();
  for (const p of products) {
    const json = p.toJSON();
    const key = productIdentityKey(json);
    const st = json.store;
    const disp = json.dispensary;
    const stQty = st && st.isActive ? st.quantity : 0;
    const dispQty = disp && disp.isActive ? disp.quantity : 0;
    const isExpired = new Date(json.expiryDate) <= today;
    const usableStQty = isExpired ? 0 : stQty;
    const usableDispQty = isExpired ? 0 : dispQty;

    if (!identityStockMap.has(key)) {
      identityStockMap.set(key, {
        usableStore: 0,
        totalStore: 0,
        storeThreshold: st ? st.threshold : 10,
        usableDispensary: 0,
        totalDispensary: 0,
        dispensaryThreshold: disp ? disp.threshold : 10,
      });
    }

    const data = identityStockMap.get(key);
    data.usableStore += usableStQty;
    data.totalStore += stQty;
    data.storeThreshold = Math.max(data.storeThreshold, st ? st.threshold : 10);
    data.usableDispensary += usableDispQty;
    data.totalDispensary += dispQty;
    data.dispensaryThreshold = Math.max(data.dispensaryThreshold, disp ? disp.threshold : 10);
  }

  let mapped = products.map((p) => {
    const json = p.toJSON();
    const key = productIdentityKey(json);
    const identStock = identityStockMap.get(key);

    const st = json.store;
    const disp = json.dispensary;
    const stQty = st && st.isActive ? st.quantity : 0;
    const dispQty = disp && disp.isActive ? disp.quantity : 0;
    const isExpired = new Date(json.expiryDate) <= today;

    let storeStatus = "Sold Out";
    if (stQty > 0) {
      if (isExpired) storeStatus = "Expired";
      else storeStatus = identStock.usableStore <= identStock.storeThreshold ? "Low Stock" : "In Stock";
    }

    let dispensaryStatus = "Sold Out";
    if (dispQty > 0) {
      if (isExpired) dispensaryStatus = "Expired";
      else dispensaryStatus = identStock.usableDispensary <= identStock.dispensaryThreshold ? "Low Stock" : "In Stock";
    }

    json.inventory = {
      store: stQty,
      dispensary: dispQty,
      storeThreshold: st ? st.threshold : 10,
      dispensaryThreshold: disp ? disp.threshold : 10,
      storeActive: st ? st.isActive : false,
      dispensaryActive: disp ? disp.isActive : false,
      storeExists: Boolean(st),
      dispensaryExists: Boolean(disp),
      storeStatus,
      dispensaryStatus,
      storeIsExpired: isExpired,
      dispensaryIsExpired: isExpired,
    };
    return json;
  });

  if (location) {
    mapped = mapped.filter((p) => {
      const inv = p.inventory;
      if (location === "store") {
        if (!inv.storeExists || !inv.storeActive) return false;
        if (minQuantity !== null && inv.store < minQuantity) return false;
        if (status && inv.storeStatus !== status) return false;
        return true;
      } else {
        if (!inv.dispensaryExists || !inv.dispensaryActive) return false;
        if (minQuantity !== null && inv.dispensary < minQuantity) return false;
        if (status && inv.dispensaryStatus !== status) return false;
        return true;
      }
    });
  } else if (status) {
    mapped = mapped.filter(
      (p) => p.inventory.storeStatus === status || p.inventory.dispensaryStatus === status
    );
  }

  const total = mapped.length;
  const pagedData = mapped.slice(skip, skip + limit);
  return { data: pagedData, total };
}

async function queryGroupedProductsWithInventory({
  match = {},
  location = null,
  minQuantity = null,
  search,
  category,
  status,
  page = 1,
  limit = 25,
  skip = 0,
}) {
  const where = { ...match };
  if (category) where.category = category;
  if (search) {
    const rx = searchLike(search);
    where[Op.or] = [
      { name: { [Op.like]: rx } },
      { brand: { [Op.like]: rx } },
      { batchNo: { [Op.like]: rx } },
      { type: { [Op.like]: rx } },
    ];
  }

  const products = await Product.findAll({
    where,
    include: [
      { model: Store, as: "store", required: false },
      { model: Dispensary, as: "dispensary", required: false },
    ],
    order: [["createdAt", "DESC"]],
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const groupMap = new Map();

  for (const prod of products) {
    const json = prod.toJSON();
    const key = productIdentityKey(json);

    const st = json.store;
    const disp = json.dispensary;

    const stQty = st && st.isActive ? st.quantity : 0;
    const dispQty = disp && disp.isActive ? disp.quantity : 0;
    const isExpired = new Date(json.expiryDate) <= today;
    const usableStQty = isExpired ? 0 : stQty;
    const usableDispQty = isExpired ? 0 : dispQty;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        ...json,
        id: String(json.id),
        _id: String(json.id),
        productId: json.id,
        batchCount: 0,
        totalQuantity: 0,
        nearestExpiry: json.expiryDate,
        inventory: {
          store: 0,
          usableStore: 0,
          dispensary: 0,
          usableDispensary: 0,
          storeThreshold: st ? st.threshold : 10,
          dispensaryThreshold: disp ? disp.threshold : 10,
          storeStatus: "In Stock",
          dispensaryStatus: "In Stock",
          storeIsExpired: isExpired,
          dispensaryIsExpired: isExpired,
        },
        batches: [],
      });
    }

    const group = groupMap.get(key);
    group.inventory.store += stQty;
    group.inventory.usableStore += usableStQty;
    group.inventory.dispensary += dispQty;
    group.inventory.usableDispensary += usableDispQty;
    group.inventory.storeThreshold = Math.max(group.inventory.storeThreshold, st ? st.threshold : 10);
    group.inventory.dispensaryThreshold = Math.max(group.inventory.dispensaryThreshold, disp ? disp.threshold : 10);
    group.totalQuantity += (stQty + dispQty);
    group.batchCount += 1;

    if (!group.nearestExpiry || (json.expiryDate && new Date(json.expiryDate) < new Date(group.nearestExpiry))) {
      group.nearestExpiry = json.expiryDate;
    }

    group.batches.push({
      ...json,
      _id: String(json.id),
      id: String(json.id),
      stQty,
      dispQty,
      stThreshold: st ? st.threshold : 10,
      dispThreshold: disp ? disp.threshold : 10,
      stActive: st ? st.isActive : false,
      dispActive: disp ? disp.isActive : false,
      stExists: Boolean(st),
      dispExists: Boolean(disp),
      isExpired,
    });
  }

  let groupedList = Array.from(groupMap.values()).map((g) => {
    const inv = g.inventory;
    inv.storeStatus =
      inv.store === 0
        ? "Sold Out"
        : inv.usableStore <= inv.storeThreshold
        ? "Low Stock"
        : "In Stock";
    inv.dispensaryStatus =
      inv.dispensary === 0
        ? "Sold Out"
        : inv.usableDispensary <= inv.dispensaryThreshold
        ? "Low Stock"
        : "In Stock";

    g.batches = g.batches.map((b) => {
      let bStoreStatus = "Sold Out";
      if (b.stQty > 0) {
        if (b.isExpired) bStoreStatus = "Expired";
        else bStoreStatus = inv.storeStatus;
      }

      let bDispStatus = "Sold Out";
      if (b.dispQty > 0) {
        if (b.isExpired) bDispStatus = "Expired";
        else bDispStatus = inv.dispensaryStatus;
      }

      return {
        ...b,
        inventory: {
          store: b.stQty,
          dispensary: b.dispQty,
          storeThreshold: b.stThreshold,
          dispensaryThreshold: b.dispThreshold,
          storeActive: b.stActive,
          dispensaryActive: b.dispActive,
          storeExists: b.stExists,
          dispensaryExists: b.dispExists,
          storeStatus: bStoreStatus,
          dispensaryStatus: bDispStatus,
          storeIsExpired: b.isExpired,
          dispensaryIsExpired: b.isExpired,
        },
        storeQuantity: b.stQty,
        dispensaryQuantity: b.dispQty,
      };
    });

    return g;
  });

  if (location) {
    groupedList = groupedList.filter((g) => {
      const inv = g.inventory;
      if (location === "store") {
        if (minQuantity !== null && inv.store < minQuantity) return false;
        if (status && inv.storeStatus !== status) return false;
        return true;
      } else {
        if (minQuantity !== null && inv.dispensary < minQuantity) return false;
        if (status && inv.dispensaryStatus !== status) return false;
        return true;
      }
    });
  } else if (status) {
    groupedList = groupedList.filter(
      (g) => g.inventory.storeStatus === status || g.inventory.dispensaryStatus === status
    );
  }

  const total = groupedList.length;
  const pagedData = groupedList.slice(skip, skip + limit);
  return { data: pagedData, total };
}

export async function GetGroupedProducts(req, res) {
  try {
    const options = productListOptions(req);
    const { data, total } = await queryGroupedProductsWithInventory({
      ...options,
      match: { visibility: "enable", [Op.or]: [{ isDeleted: false }, { isDeleted: null }, { isDeleted: 0 }] },
    });
    return res.json(paginated(data, { page: options.page, limit: options.limit, total }));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function GetGroupedStoreProducts(req, res) {
  try {
    const options = productListOptions(req);
    const { data, total } = await queryGroupedProductsWithInventory({
      ...options,
      match: { [Op.or]: [{ isDeleted: false }, { isDeleted: null }, { isDeleted: 0 }] },
      location: "store",
    });
    return res.json(paginated(data, { page: options.page, limit: options.limit, total }));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function GetGroupedDispensaryProducts(req, res) {
  try {
    const options = productListOptions(req);
    const { data, total } = await queryGroupedProductsWithInventory({
      ...options,
      match: { [Op.or]: [{ isDeleted: false }, { isDeleted: null }, { isDeleted: 0 }] },
      location: "dispensary",
    });
    return res.json(paginated(data, { page: options.page, limit: options.limit, total }));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function GetGroupedSellableProducts(req, res) {
  try {
    const options = productListOptions(req);
    const { data, total } = await queryGroupedProductsWithInventory({
      ...options,
      match: { visibility: "enable", [Op.or]: [{ isDeleted: false }, { isDeleted: null }, { isDeleted: 0 }] },
      location: "dispensary",
      minQuantity: 1,
    });
    return res.json(paginated(data, { page: options.page, limit: options.limit, total }));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function CreateProductInDispensary(req, res) {
  const t = await sequelize.transaction();
  try {
    const userId = req.user.id || req.user._id;
    let {
      name,
      unitPrice,
      quantity,
      batchNo,
      expiryDate,
      markup,
      DosageForms,
      category,
      distributor,
      brand,
      sellingPrice,
      storeThreshold = 10,
      dispensaryThreshold = 10,
      type = "",
    } = req.body;

    if (!batchNo) {
      batchNo = `BATCH-${Date.now().toString(36).toUpperCase()}`;
    }

    if (!distributor || !distributor.name) {
      distributor = { name: "Unknown", contact: "0000000000" };
    }

    if (!unitPrice && sellingPrice && markup) {
      unitPrice = sellingPrice / (1 + markup / 100);
    } else if (!unitPrice) {
      return res.status(400).json({
        message: "Unit price is required, or provide sellingPrice and markup to calculate it",
      });
    }

    const calculatedPrices = calculateInterdependentPrices({}, { unitPrice, sellingPrice, markup });
    unitPrice = calculatedPrices.unitPrice;
    sellingPrice = calculatedPrices.sellingPrice;
    markup = calculatedPrices.markup;

    const product = await Product.create(
      {
        addedBy: userId,
        name,
        brand: brand || "no_brand",
        unitPrice,
        quantity,
        totalPrice: unitPrice * quantity,
        batchNo,
        expiryDate: new Date(expiryDate),
        markup,
        sellingPrice,
        totalSellingPrice: sellingPrice * quantity,
        DosageForms: DosageForms || "",
        category: category || "",
        distributor,
        type,
        visibility: "enable",
        isDeleted: false,
      },
      { transaction: t }
    );

    await Dispensary.create(
      {
        productId: product.id,
        quantity,
        initialDispensaryQty: quantity,
        threshold: dispensaryThreshold,
        isActive: true,
        isDeleted: false,
      },
      { transaction: t }
    );

    await Store.create(
      {
        productId: product.id,
        quantity: 0,
        initialStoreQty: 0,
        threshold: storeThreshold,
        isActive: true,
        isDeleted: false,
      },
      { transaction: t }
    );

    await Transfare.create(
      {
        productId: product.id,
        userId,
        type: "UPDATED_IN_DISPENSARY",
        UpdateType: "QUANTITY_ADDED",
        quantity,
        quantityLeft: quantity,
        totalQuantity: quantity,
        issuedPrice: sellingPrice,
        unitPrice,
        totalIssuedPrice: sellingPrice * quantity,
        totalUnitPrice: unitPrice * quantity,
        notes: "Direct creation in dispensary",
      },
      { transaction: t }
    );

    await t.commit();

    await Store.updateStatus(product.id);
    await Dispensary.updateStatus(product.id);
    syncExpiryNotificationsInBackground(product);

    const populated = await populateProductWithInventory(product);
    res.status(201).json(populated);
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
}

export async function CreateProduct(req, res) {
  const t = await sequelize.transaction();
  try {
    const userId = req.user.id || req.user._id;
    let {
      name,
      unitPrice,
      quantity,
      batchNo,
      expiryDate,
      markup,
      DosageForms,
      category,
      distributor,
      brand,
      sellingPrice,
      storeThreshold = 10,
      dispensaryThreshold = 10,
      type = "",
    } = req.body;

    if (!batchNo) {
      batchNo = `BATCH-${Date.now().toString(36).toUpperCase()}`;
    }

    if (!distributor || !distributor.name) {
      distributor = { name: "Unknown", contact: "0000000000" };
    }

    if (!unitPrice && sellingPrice && markup) {
      unitPrice = sellingPrice / (1 + markup / 100);
    } else if (!unitPrice) {
      return res.status(400).json({
        message: "Unit price is required, or provide sellingPrice and markup to calculate it",
      });
    }

    const calculatedPrices = calculateInterdependentPrices({}, { unitPrice, sellingPrice, markup });
    unitPrice = calculatedPrices.unitPrice;
    sellingPrice = calculatedPrices.sellingPrice;
    markup = calculatedPrices.markup;

    const product = await Product.create(
      {
        addedBy: userId,
        name,
        brand: brand || "no_brand",
        unitPrice,
        quantity,
        totalPrice: unitPrice * quantity,
        batchNo,
        expiryDate: new Date(expiryDate),
        markup,
        sellingPrice,
        totalSellingPrice: sellingPrice * quantity,
        DosageForms: DosageForms || "",
        category: category || "",
        distributor,
        type,
        visibility: "enable",
        isDeleted: false,
      },
      { transaction: t }
    );

    await Store.create(
      {
        productId: product.id,
        quantity,
        initialStoreQty: quantity,
        threshold: storeThreshold,
        isActive: true,
        isDeleted: false,
      },
      { transaction: t }
    );

    await Dispensary.create(
      {
        productId: product.id,
        quantity: 0,
        initialDispensaryQty: 0,
        threshold: dispensaryThreshold,
        isActive: true,
        isDeleted: false,
      },
      { transaction: t }
    );

    await Transfare.create(
      {
        productId: product.id,
        userId,
        type: "UPDATED_IN_STORE",
        UpdateType: "QUANTITY_ADDED",
        quantity,
        quantityLeft: quantity,
        totalQuantity: quantity,
        issuedPrice: sellingPrice,
        unitPrice,
        totalIssuedPrice: sellingPrice * quantity,
        totalUnitPrice: unitPrice * quantity,
        notes: "Direct creation in store",
      },
      { transaction: t }
    );

    await t.commit();

    await Store.updateStatus(product.id);
    await Dispensary.updateStatus(product.id);
    syncExpiryNotificationsInBackground(product);

    const populated = await populateProductWithInventory(product);
    res.status(201).json(populated);
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
}

export async function SmartDeleteProduct(req, res) {
  try {
    const id = req.params.id;
    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const salesCount = await Sales.count({ where: { productId: id } });
    if (salesCount > 0) {
      product.isDeleted = true;
      product.visibility = "deleted";
      product.deletedAt = new Date();
      product.deletedBy = req.user.id || req.user._id;
      await product.save();

      await Store.update({ isDeleted: true }, { where: { productId: id } });
      await Dispensary.update({ isDeleted: true }, { where: { productId: id } });

      return res.json({ message: "Product soft deleted (has sales history)", type: "soft" });
    }

    await Store.destroy({ where: { productId: id } });
    await Dispensary.destroy({ where: { productId: id } });
    await Transfare.destroy({ where: { productId: id } });
    await product.destroy();

    return res.json({ message: "Product hard deleted", type: "hard" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function HardDeleteProduct(req, res) {
  try {
    const id = req.params.id;
    await Store.destroy({ where: { productId: id } });
    await Dispensary.destroy({ where: { productId: id } });
    await Transfare.destroy({ where: { productId: id } });
    await Product.destroy({ where: { id } });
    return res.json({ message: "Product hard deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function UpdateProduct(req, res) {
  try {
    const id = req.params.id;
    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const updates = { ...req.body };
    const priceUpdates = calculateInterdependentPrices(product.toJSON(), updates);
    Object.assign(product, priceUpdates);

    if (updates.expiryDate) product.expiryDate = new Date(updates.expiryDate);
    await product.save();

    await Store.updateStatus(id);
    await Dispensary.updateStatus(id);
    syncExpiryNotificationsInBackground(product);

    const populated = await populateProductWithInventory(product);
    return res.json(populated);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function DeleteFromDispensary(req, res) {
  try {
    const id = req.params.id;
    const dispensary = await Dispensary.findOne({ where: { productId: id } });
    if (!dispensary) return res.status(404).json({ message: "Dispensary product not found" });

    dispensary.quantity = 0;
    dispensary.isActive = false;
    await dispensary.save();

    return res.json({ message: "Removed from dispensary successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function IssueToDispensary(req, res) {
  const t = await sequelize.transaction();
  try {
    const { productId, quantity, notes } = req.body;
    const userId = req.user.id || req.user._id;

    const qty = Number(quantity);
    if (!qty || qty <= 0) return res.status(400).json({ message: "Quantity must be greater than 0" });

    const store = await Store.findOne({ where: { productId, isDeleted: false }, transaction: t });
    if (!store || store.quantity < qty) {
      throw new Error("Insufficient stock in store");
    }

    let dispensary = await Dispensary.findOne({ where: { productId, isDeleted: false }, transaction: t });
    if (!dispensary) {
      dispensary = await Dispensary.create(
        { productId, quantity: 0, initialDispensaryQty: 0, threshold: 10, isActive: true, isDeleted: false },
        { transaction: t }
      );
    }

    store.quantity -= qty;
    await store.save({ transaction: t });

    dispensary.quantity += qty;
    dispensary.isActive = true;
    await dispensary.save({ transaction: t });

    const product = await Product.findByPk(productId, { transaction: t });

    await Transfare.create(
      {
        productId,
        userId,
        type: "ISSUE_TO_DISPENSARY",
        UpdateType: "QUANTITY_ADDED",
        quantity: qty,
        quantityLeft: dispensary.quantity,
        totalQuantity: product.quantity,
        issuedPrice: product.sellingPrice,
        unitPrice: product.unitPrice,
        totalIssuedPrice: product.sellingPrice * qty,
        totalUnitPrice: product.unitPrice * qty,
        notes: notes || "Transfer to dispensary",
      },
      { transaction: t }
    );

    await t.commit();

    await Store.updateStatus(productId);
    await Dispensary.updateStatus(productId);

    return res.json({ message: "Stock issued to dispensary successfully" });
  } catch (error) {
    await t.rollback();
    return res.status(400).json({ message: error.message });
  }
}

export async function ReturnToStore(req, res) {
  const t = await sequelize.transaction();
  try {
    const { productId, quantity, notes } = req.body;
    const userId = req.user.id || req.user._id;

    const qty = Number(quantity);
    if (!qty || qty <= 0) return res.status(400).json({ message: "Quantity must be greater than 0" });

    const dispensary = await Dispensary.findOne({ where: { productId, isDeleted: false }, transaction: t });
    if (!dispensary || dispensary.quantity < qty) {
      throw new Error("Insufficient stock in dispensary");
    }

    let store = await Store.findOne({ where: { productId, isDeleted: false }, transaction: t });
    if (!store) {
      store = await Store.create(
        { productId, quantity: 0, initialStoreQty: 0, threshold: 10, isActive: true, isDeleted: false },
        { transaction: t }
      );
    }

    dispensary.quantity -= qty;
    await dispensary.save({ transaction: t });

    store.quantity += qty;
    store.isActive = true;
    await store.save({ transaction: t });

    const product = await Product.findByPk(productId, { transaction: t });

    await Transfare.create(
      {
        productId,
        userId,
        type: "RETURN_TO_STORE",
        UpdateType: "QUANTITY_ADDED",
        quantity: qty,
        quantityLeft: store.quantity,
        totalQuantity: product.quantity,
        issuedPrice: product.sellingPrice,
        unitPrice: product.unitPrice,
        totalIssuedPrice: product.sellingPrice * qty,
        totalUnitPrice: product.unitPrice * qty,
        notes: notes || "Return to store",
      },
      { transaction: t }
    );

    await t.commit();

    await Store.updateStatus(productId);
    await Dispensary.updateStatus(productId);

    return res.json({ message: "Stock returned to store successfully" });
  } catch (error) {
    await t.rollback();
    return res.status(400).json({ message: error.message });
  }
}

async function listTransfers(req, res, type) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { rows, count: total } = await Transfare.findAndCountAll({
      where: { type },
      include: [
        { model: Product, as: "productDetails", attributes: ["id", "name", "brand", "batchNo"] },
        { model: User, as: "userDetails", attributes: ["id", "name"] },
      ],
      order: [["date", "DESC"]],
      offset: skip,
      limit,
    });

    const data = rows.map((r) => {
      const json = r.toJSON();
      if (json.productDetails) json.product = json.productDetails;
      if (json.userDetails) json.user = json.userDetails;
      return json;
    });

    return res.json(paginated(data, { page, limit, total }));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function GetIssuedDispensary(req, res) {
  return listTransfers(req, res, "ISSUE_TO_DISPENSARY");
}

export async function GetReturnToStore(req, res) {
  return listTransfers(req, res, "RETURN_TO_STORE");
}

export async function GetAllProducts(req, res) {
  try {
    const options = productListOptions(req);
    const { data, total } = await queryProductsWithInventory({
      ...options,
      match: { isDeleted: false },
    });
    return res.json(paginated(data, { page: options.page, limit: options.limit, total }));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function GetStoreProduct(req, res) {
  try {
    const options = productListOptions(req);
    const { data, total } = await queryProductsWithInventory({
      ...options,
      match: { isDeleted: false },
      location: "store",
    });
    return res.json(paginated(data, { page: options.page, limit: options.limit, total }));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function GetDispensaryProduct(req, res) {
  try {
    const options = productListOptions(req);
    const { data, total } = await queryProductsWithInventory({
      ...options,
      match: { isDeleted: false },
      location: "dispensary",
    });
    return res.json(paginated(data, { page: options.page, limit: options.limit, total }));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function GetDispensaryProductToSell(req, res) {
  try {
    const options = productListOptions(req);
    const { data, total } = await queryProductsWithInventory({
      ...options,
      match: { isDeleted: false, visibility: "enable" },
      location: "dispensary",
      minQuantity: 1,
    });
    return res.json(paginated(data, { page: options.page, limit: options.limit, total }));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function GetCountedStore(req, res) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items = await Store.findAll({
      where: {
        [Op.or]: [{ isDeleted: false }, { isDeleted: null }, { isDeleted: 0 }],
        isActive: true,
      },
      include: [
        {
          model: Product,
          as: "productDetails",
          where: {
            [Op.or]: [{ isDeleted: false }, { isDeleted: null }, { isDeleted: 0 }],
          },
          attributes: ["id", "name", "brand", "unitPrice", "sellingPrice", "expiryDate"],
        },
      ],
    });

    let totalInStore = 0;
    let expiredInStore = 0;
    let totalInventoryValue = 0;
    let totalSellingValue = 0;

    const groupMap = new Map();

    for (const item of items) {
      const prod = item.productDetails;
      if (!prod) continue;
      const qty = item.quantity || 0;
      totalInStore += qty;

      const isExpired = new Date(prod.expiryDate) <= today;
      if (isExpired && qty > 0) {
        expiredInStore += qty;
      }

      totalInventoryValue += (prod.unitPrice || 0) * qty;
      totalSellingValue += (prod.sellingPrice || 0) * qty;

      const key = productIdentityKey(prod);
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          usableQty: 0,
          threshold: item.threshold || 10,
        });
      }

      const grp = groupMap.get(key);
      if (!isExpired) grp.usableQty += qty;
      grp.threshold = Math.max(grp.threshold, item.threshold || 10);
    }

    let lowInStore = 0;
    for (const grp of groupMap.values()) {
      if (grp.usableQty <= grp.threshold) {
        lowInStore += 1;
      }
    }

    const potentialProfit = Math.round((totalSellingValue - totalInventoryValue) * 100) / 100;

    return res.json({
      totalInStore,
      lowInStore,
      expiredInStore,
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
      totalSellingValue: Math.round(totalSellingValue * 100) / 100,
      potentialProfit,
      totalQuantity: totalInStore,
      totalUnitPrice: Math.round(totalInventoryValue * 100) / 100,
      totalSellingPrice: Math.round(totalSellingValue * 100) / 100,
      itemCount: items.length,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function GetCountedDispensary(req, res) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items = await Dispensary.findAll({
      where: {
        [Op.or]: [{ isDeleted: false }, { isDeleted: null }, { isDeleted: 0 }],
        isActive: true,
      },
      include: [
        {
          model: Product,
          as: "productDetails",
          where: {
            [Op.or]: [{ isDeleted: false }, { isDeleted: null }, { isDeleted: 0 }],
          },
          attributes: ["id", "name", "brand", "unitPrice", "sellingPrice", "expiryDate"],
        },
      ],
    });

    let totalInDispensary = 0;
    let expiredInDispensary = 0;
    let totalInventoryValue = 0;
    let totalSellingValue = 0;

    const groupMap = new Map();

    for (const item of items) {
      const prod = item.productDetails;
      if (!prod) continue;
      const qty = item.quantity || 0;
      totalInDispensary += qty;

      const isExpired = new Date(prod.expiryDate) <= today;
      if (isExpired && qty > 0) {
        expiredInDispensary += qty;
      }

      totalInventoryValue += (prod.unitPrice || 0) * qty;
      totalSellingValue += (prod.sellingPrice || 0) * qty;

      const key = productIdentityKey(prod);
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          usableQty: 0,
          threshold: item.threshold || 10,
        });
      }

      const grp = groupMap.get(key);
      if (!isExpired) grp.usableQty += qty;
      grp.threshold = Math.max(grp.threshold, item.threshold || 10);
    }

    let lowInDispensary = 0;
    for (const grp of groupMap.values()) {
      if (grp.usableQty <= grp.threshold) {
        lowInDispensary += 1;
      }
    }

    const potentialProfit = Math.round((totalSellingValue - totalInventoryValue) * 100) / 100;

    return res.json({
      totalInDispensary,
      lowInDispensary,
      expiredInDispensary,
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
      totalSellingValue: Math.round(totalSellingValue * 100) / 100,
      potentialProfit,
      totalQuantity: totalInDispensary,
      totalUnitPrice: Math.round(totalInventoryValue * 100) / 100,
      totalSellingPrice: Math.round(totalSellingValue * 100) / 100,
      itemCount: items.length,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function CountAllProduct(req, res) {
  try {
    const total = await Product.count({ where: { isDeleted: false } });
    return res.json({ total });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function BulkImportProducts(req, res) {
  const t = await sequelize.transaction();
  try {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "Products array is required" });
    }

    const userId = req.user.id || req.user._id;
    const createdProducts = [];

    for (const p of products) {
      const batchNo = p.batchNo || `BATCH-${Date.now().toString(36).toUpperCase()}`;
      const unitPrice = Number(p.unitPrice || 0);
      const markup = Number(p.markup || 20);
      const sellingPrice = p.sellingPrice ? Number(p.sellingPrice) : unitPrice * (1 + markup / 100);
      const qty = Number(p.quantity || 0);

      const prod = await Product.create(
        {
          addedBy: userId,
          name: p.name,
          brand: p.brand || "no_brand",
          unitPrice,
          quantity: qty,
          totalPrice: unitPrice * qty,
          batchNo,
          expiryDate: new Date(p.expiryDate),
          markup,
          sellingPrice,
          totalSellingPrice: sellingPrice * qty,
          DosageForms: p.DosageForms || "",
          category: p.category || "",
          distributor: p.distributor || { name: "Unknown", contact: "0000000000" },
          isDeleted: false,
          visibility: "enable",
        },
        { transaction: t }
      );

      await Store.create(
        {
          productId: prod.id,
          quantity: qty,
          initialStoreQty: qty,
          threshold: 10,
          isActive: true,
          isDeleted: false,
        },
        { transaction: t }
      );

      await Dispensary.create(
        {
          productId: prod.id,
          quantity: 0,
          initialDispensaryQty: 0,
          threshold: 10,
          isActive: true,
          isDeleted: false,
        },
        { transaction: t }
      );

      createdProducts.push(prod);
    }

    await t.commit();
    syncExpiryNotificationsInBackground(createdProducts);

    return res.status(201).json({ message: `Successfully imported ${createdProducts.length} products` });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ message: error.message });
  }
}

export async function UpdateStoreQuantity(req, res) {
  try {
    const id = req.params.id;
    const { quantity } = req.body;
    const store = await Store.findOne({ where: { productId: id } });
    if (!store) return res.status(404).json({ message: "Store record not found" });

    store.quantity = Number(quantity);
    await store.save();

    const product = await Product.findByPk(id);
    const disp = await Dispensary.findOne({ where: { productId: id } });
    if (product) {
      product.quantity = store.quantity + (disp ? disp.quantity : 0);
      await product.save();
    }

    return res.json({ message: "Store quantity updated successfully", store });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function UpdateDispensaryQuantity(req, res) {
  try {
    const id = req.params.id;
    const { quantity } = req.body;
    const dispensary = await Dispensary.findOne({ where: { productId: id } });
    if (!dispensary) return res.status(404).json({ message: "Dispensary record not found" });

    dispensary.quantity = Number(quantity);
    await dispensary.save();

    const product = await Product.findByPk(id);
    const store = await Store.findOne({ where: { productId: id } });
    if (product) {
      product.quantity = (store ? store.quantity : 0) + dispensary.quantity;
      await product.save();
    }

    return res.json({ message: "Dispensary quantity updated successfully", dispensary });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
