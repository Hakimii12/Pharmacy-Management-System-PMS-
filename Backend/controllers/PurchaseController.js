import { Op } from "sequelize";
import Supplier from "../models/Supplier.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import Product from "../models/ProductModel.js";
import Store from "../models/StoreModel.js";
import Dispensary from "../models/DispensaryModel.js";
import Transfare from "../models/Transfer.js";
import User from "../models/UserModel.js";
import { syncExpiryNotificationsInBackground } from "../services/notificationService.js";
import { getPagination, paginated, searchLike } from "../utils/pagination.js";
import { productIdentityKey } from "../utils/productIdentity.js";

function generateBatchNo() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let batchNo = "";
  for (let i = 0; i < 6; i++) {
    batchNo += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return batchNo;
}

async function uniqueBatchNo() {
  for (let attempt = 0; attempt < 20; attempt++) {
    const batchNo = generateBatchNo();
    const existing = await Product.findOne({ where: { batchNo, isDeleted: false } });
    if (!existing) return batchNo;
  }
  return `${generateBatchNo()}${Date.now().toString(36).slice(-2).toUpperCase()}`;
}

async function nextOrderNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `PO-${stamp}-`;
  const latest = await PurchaseOrder.findOne({
    where: { orderNumber: { [Op.like]: `${prefix}%` } },
    order: [["orderNumber", "DESC"]],
    attributes: ["orderNumber"],
  });

  let seq = 1;
  if (latest?.orderNumber) {
    const tail = Number.parseInt(String(latest.orderNumber).split("-").pop() || "0", 10);
    if (Number.isFinite(tail)) seq = tail + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

function recomputeStatus(order) {
  if (order.status === "cancelled") return "cancelled";
  const lines = order.lines || [];
  if (lines.length === 0) return order.status === "ordered" ? "ordered" : "draft";

  const anyReceived = lines.some((line) => (line.quantityReceived || 0) > 0);
  const allReceived = lines.every((line) => (line.quantityReceived || 0) >= line.quantityOrdered);

  if (allReceived && anyReceived) return "received";
  if (anyReceived) return "partial";
  if (order.status === "ordered" || order.orderedAt) return "ordered";
  return "draft";
}

async function createStoreBatchFromLine({ line, supplier, userId, orderNumber }) {
  const qty = Number(line.receiveQty);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error(`Invalid receive quantity for ${line.name}`);
  }

  const unitCost = Number(line.unitCost);
  if (!Number.isFinite(unitCost) || unitCost < 0) {
    throw new Error(`Invalid unit cost for ${line.name}`);
  }

  const markup = Number.isFinite(Number(line.markup)) ? Number(line.markup) : 20;
  const batchNo = line.batchNo?.trim() || (await uniqueBatchNo());
  if (!line.expiryDate) {
    throw new Error(`Expiry date is required to receive ${line.name}`);
  }

  const existingBatch = await Product.findOne({ where: { batchNo, isDeleted: false } });
  if (existingBatch) {
    throw new Error(`Batch number ${batchNo} already exists`);
  }

  const brand = line.brand || "no_brand";
  const sellingPrice = unitCost * (1 + markup / 100);
  const product = await Product.create({
    addedBy: userId,
    name: line.name.trim(),
    brand,
    unitPrice: unitCost,
    quantity: qty,
    totalPrice: unitCost * qty,
    batchNo,
    expiryDate: new Date(line.expiryDate),
    markup,
    sellingPrice,
    totalSellingPrice: sellingPrice * qty,
    DosageForms: line.DosageForms || "",
    category: line.category || "",
    distributor: {
      name: supplier.name,
      contact: supplier.contact || "0000000000",
    },
    isDeleted: false,
    visibility: "enable",
    type: "",
  });

  await Store.create({
    productId: product.id,
    quantity: qty,
    initialStoreQty: qty,
    threshold: 10,
    isDeleted: false,
    isActive: true,
  });

  await Dispensary.create({
    productId: product.id,
    quantity: 0,
    initialDispensaryQty: 0,
    threshold: 10,
    isDeleted: false,
    isActive: true,
  });

  await Store.updateStatus(product.id);
  await Dispensary.updateStatus(product.id);

  await Transfare.create({
    productId: product.id,
    userId,
    type: "PURCHASE_RECEIPT",
    UpdateType: "QUANTITY_ADDED",
    quantity: qty,
    quantityLeft: qty,
    totalQuantity: qty,
    unitPrice: unitCost,
    totalUnitPrice: unitCost * qty,
    notes: `PO ${orderNumber}`,
  });

  return product;
}

// ─── Suppliers ───────────────────────────────────────────────────────────────

export async function ListSuppliers(req, res) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const where = { isDeleted: false };
    if (req.query.search) {
      const rx = searchLike(req.query.search);
      where[Op.or] = [
        { name: { [Op.like]: rx } },
        { contact: { [Op.like]: rx } },
        { email: { [Op.like]: rx } },
      ];
    }

    const { rows, count: total } = await Supplier.findAndCountAll({
      where,
      order: [["name", "ASC"]],
      offset: skip,
      limit,
    });

    return res.status(200).json(paginated(rows, { page, limit, total }));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function CreateSupplier(req, res) {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ message: "Supplier name is required" });

    const supplier = await Supplier.create({
      name,
      contact: req.body.contact?.trim() || "",
      email: req.body.email?.trim() || "",
      address: req.body.address?.trim() || "",
      notes: req.body.notes?.trim() || "",
      createdBy: req.user.id || req.user._id,
    });

    return res.status(201).json({ message: "Supplier created", supplier: supplier.toJSON() });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function UpdateSupplier(req, res) {
  try {
    const supplier = await Supplier.findOne({
      where: { id: req.params.id, isDeleted: false },
    });
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });

    const fields = ["name", "contact", "email", "address", "notes"];
    for (const field of fields) {
      if (req.body[field] !== undefined) supplier[field] = String(req.body[field]).trim();
    }
    if (!supplier.name) return res.status(400).json({ message: "Supplier name is required" });

    await supplier.save();
    return res.status(200).json({ message: "Supplier updated", supplier: supplier.toJSON() });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function DeleteSupplier(req, res) {
  try {
    const supplier = await Supplier.findOne({
      where: { id: req.params.id, isDeleted: false },
    });
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });

    const openOrders = await PurchaseOrder.count({
      where: {
        supplierId: supplier.id,
        status: { [Op.in]: ["draft", "ordered", "partial"] },
      },
    });
    if (openOrders > 0) {
      return res.status(400).json({
        message: "Cannot delete a supplier with open purchase orders",
        openOrders,
      });
    }

    supplier.isDeleted = true;
    await supplier.save();
    return res.status(200).json({ message: "Supplier deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

// ─── Purchase orders ─────────────────────────────────────────────────────────

export async function ListPurchaseOrders(req, res) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.supplier) where.supplierId = req.query.supplier;
    if (req.query.search) {
      where.orderNumber = { [Op.like]: searchLike(req.query.search) };
    }

    const { rows, count: total } = await PurchaseOrder.findAndCountAll({
      where,
      include: [
        { model: Supplier, as: "supplierDetails", attributes: ["id", "name", "contact", "email"] },
        { model: User, as: "creator", attributes: ["id", "name"] },
        { model: User, as: "receiver", attributes: ["id", "name"] },
      ],
      order: [["createdAt", "DESC"]],
      offset: skip,
      limit,
    });

    const data = rows.map((order) => {
      const json = order.toJSON();
      if (json.supplierDetails) json.supplier = json.supplierDetails;
      if (json.creator) json.createdBy = json.creator;
      if (json.receiver) json.receivedBy = json.receiver;
      return json;
    });

    return res.status(200).json(paginated(data, { page, limit, total }));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function GetPurchaseOrder(req, res) {
  try {
    const order = await PurchaseOrder.findByPk(req.params.id, {
      include: [
        { model: Supplier, as: "supplierDetails", attributes: ["id", "name", "contact", "email", "address"] },
        { model: User, as: "creator", attributes: ["id", "name"] },
        { model: User, as: "receiver", attributes: ["id", "name"] },
      ],
    });

    if (!order) return res.status(404).json({ message: "Purchase order not found" });

    const json = order.toJSON();
    if (json.supplierDetails) json.supplier = json.supplierDetails;
    if (json.creator) json.createdBy = json.creator;
    if (json.receiver) json.receivedBy = json.receiver;

    return res.status(200).json({ order: json });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

function normalizeLines(rawLines = []) {
  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    throw new Error("At least one line item is required");
  }

  return rawLines.map((line, index) => {
    const name = String(line.name || "").trim();
    const quantityOrdered = Number(line.quantityOrdered);
    const unitCost = Number(line.unitCost);

    if (!name) throw new Error(`Line ${index + 1}: product name is required`);
    if (!Number.isFinite(quantityOrdered) || quantityOrdered < 1) {
      throw new Error(`Line ${index + 1}: quantity must be at least 1`);
    }
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      throw new Error(`Line ${index + 1}: unit cost is invalid`);
    }

    return {
      id: line.id || line._id || `line_${index + 1}_${Date.now()}`,
      _id: line.id || line._id || `line_${index + 1}_${Date.now()}`,
      name,
      brand: String(line.brand || "no_brand").trim() || "no_brand",
      category: String(line.category || "").trim(),
      DosageForms: String(line.DosageForms || "").trim(),
      quantityOrdered,
      quantityReceived: line.quantityReceived || 0,
      unitCost,
      markup: Number.isFinite(Number(line.markup)) ? Number(line.markup) : 20,
      batchNo: line.batchNo ? String(line.batchNo).trim() : undefined,
      expiryDate: line.expiryDate || undefined,
      notes: line.notes ? String(line.notes).trim() : undefined,
    };
  });
}

export async function CreatePurchaseOrder(req, res) {
  try {
    const supplierId = req.body.supplier;
    if (!supplierId) return res.status(400).json({ message: "Supplier is required" });

    const supplier = await Supplier.findOne({
      where: { id: supplierId, isDeleted: false },
    });
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });

    const lines = normalizeLines(req.body.lines);
    const place = Boolean(req.body.place);
    const currentUserId = req.user.id || req.user._id;

    const order = await PurchaseOrder.create({
      orderNumber: await nextOrderNumber(),
      supplierId: supplier.id,
      status: place ? "ordered" : "draft",
      lines,
      notes: req.body.notes?.trim() || "",
      expectedDate: req.body.expectedDate || null,
      orderedAt: place ? new Date() : null,
      createdBy: currentUserId,
    });

    const populated = await PurchaseOrder.findByPk(order.id, {
      include: [
        { model: Supplier, as: "supplierDetails", attributes: ["id", "name", "contact", "email"] },
        { model: User, as: "creator", attributes: ["id", "name"] },
      ],
    });

    const json = populated.toJSON();
    if (json.supplierDetails) json.supplier = json.supplierDetails;
    if (json.creator) json.createdBy = json.creator;

    return res.status(201).json({
      message: place ? "Purchase order placed" : "Purchase order drafted",
      order: json,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

export async function UpdatePurchaseOrder(req, res) {
  try {
    const order = await PurchaseOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: "Purchase order not found" });
    if (!["draft", "ordered"].includes(order.status)) {
      return res.status(400).json({ message: "Only draft or ordered POs can be edited" });
    }
    if ((order.lines || []).some((line) => (line.quantityReceived || 0) > 0)) {
      return res.status(400).json({ message: "Cannot edit a PO that has already received stock" });
    }

    if (req.body.supplier) {
      const supplier = await Supplier.findOne({
        where: { id: req.body.supplier, isDeleted: false },
      });
      if (!supplier) return res.status(404).json({ message: "Supplier not found" });
      order.supplierId = supplier.id;
    }

    if (req.body.lines) order.lines = normalizeLines(req.body.lines);
    if (req.body.notes !== undefined) order.notes = String(req.body.notes).trim();
    if (req.body.expectedDate !== undefined) {
      order.expectedDate = req.body.expectedDate || null;
    }

    await order.save();

    const populated = await PurchaseOrder.findByPk(order.id, {
      include: [
        { model: Supplier, as: "supplierDetails", attributes: ["id", "name", "contact", "email"] },
        { model: User, as: "creator", attributes: ["id", "name"] },
      ],
    });

    const json = populated.toJSON();
    if (json.supplierDetails) json.supplier = json.supplierDetails;
    if (json.creator) json.createdBy = json.creator;

    return res.status(200).json({ message: "Purchase order updated", order: json });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

export async function PlacePurchaseOrder(req, res) {
  try {
    const order = await PurchaseOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: "Purchase order not found" });
    if (order.status !== "draft") {
      return res.status(400).json({ message: "Only draft orders can be placed" });
    }
    if (!order.lines?.length) {
      return res.status(400).json({ message: "Add at least one line before placing" });
    }

    order.status = "ordered";
    order.orderedAt = new Date();
    await order.save();

    return res.status(200).json({ message: "Purchase order placed", order: order.toJSON() });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function CancelPurchaseOrder(req, res) {
  try {
    const order = await PurchaseOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: "Purchase order not found" });
    if (["received", "cancelled"].includes(order.status)) {
      return res.status(400).json({ message: `Cannot cancel a ${order.status} order` });
    }
    if ((order.lines || []).some((line) => (line.quantityReceived || 0) > 0)) {
      return res.status(400).json({
        message: "Cannot cancel after stock has been received — finish remaining lines or leave as partial",
      });
    }

    order.status = "cancelled";
    await order.save();
    return res.status(200).json({ message: "Purchase order cancelled", order: order.toJSON() });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function ReceivePurchaseOrder(req, res) {
  try {
    const order = await PurchaseOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: "Purchase order not found" });
    if (!["ordered", "partial"].includes(order.status)) {
      return res.status(400).json({ message: "Only ordered or partially received POs can be received" });
    }

    const supplier = await Supplier.findOne({
      where: { id: order.supplierId, isDeleted: false },
    });
    if (!supplier) {
      return res.status(400).json({ message: "Supplier is missing or deleted" });
    }

    const incoming = Array.isArray(req.body.lines) ? req.body.lines : [];
    if (incoming.length === 0) {
      return res.status(400).json({ message: "Provide at least one line to receive" });
    }

    const createdProducts = [];
    const currentLines = [...(order.lines || [])];
    const currentUserId = req.user.id || req.user._id;

    for (const item of incoming) {
      const line = currentLines.find(
        (l) => String(l.id) === String(item.lineId) || String(l._id) === String(item.lineId)
      );
      if (!line) {
        return res.status(400).json({ message: `Unknown line ${item.lineId}` });
      }

      const remaining = line.quantityOrdered - (line.quantityReceived || 0);
      const receiveQty = Number(item.receiveQty);
      if (!Number.isFinite(receiveQty) || receiveQty <= 0) {
        return res.status(400).json({ message: `Invalid receive qty for ${line.name}` });
      }
      if (receiveQty > remaining) {
        return res.status(400).json({
          message: `Cannot receive ${receiveQty} of ${line.name}; only ${remaining} remaining`,
        });
      }

      const product = await createStoreBatchFromLine({
        line: {
          name: line.name,
          brand: line.brand,
          category: line.category,
          DosageForms: line.DosageForms,
          unitCost: item.unitCost !== undefined ? item.unitCost : line.unitCost,
          markup: item.markup !== undefined ? item.markup : line.markup,
          batchNo: item.batchNo || line.batchNo,
          expiryDate: item.expiryDate || line.expiryDate,
          receiveQty,
        },
        supplier,
        userId: currentUserId,
        orderNumber: order.orderNumber,
      });

      line.quantityReceived = (line.quantityReceived || 0) + receiveQty;
      line.receivedProduct = product.id;
      if (item.batchNo) line.batchNo = String(item.batchNo).trim();
      if (item.expiryDate) line.expiryDate = new Date(item.expiryDate);
      if (item.unitCost !== undefined) line.unitCost = Number(item.unitCost);
      if (item.markup !== undefined) line.markup = Number(item.markup);

      createdProducts.push(product);
    }

    order.lines = currentLines;
    order.status = recomputeStatus(order);
    order.receivedBy = currentUserId;
    if (order.status === "received") order.receivedAt = new Date();
    await order.save();

    if (createdProducts.length) {
      syncExpiryNotificationsInBackground(createdProducts);
    }

    const populated = await PurchaseOrder.findByPk(order.id, {
      include: [
        { model: Supplier, as: "supplierDetails", attributes: ["id", "name", "contact", "email"] },
        { model: User, as: "creator", attributes: ["id", "name"] },
        { model: User, as: "receiver", attributes: ["id", "name"] },
      ],
    });

    const json = populated.toJSON();
    if (json.supplierDetails) json.supplier = json.supplierDetails;
    if (json.creator) json.createdBy = json.creator;
    if (json.receiver) json.receivedBy = json.receiver;

    return res.status(200).json({
      message: `Received ${createdProducts.length} batch(es) into store`,
      order: json,
      products: createdProducts.map((p) => p.id),
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

export async function GetReorderSuggestions(req, res) {
  try {
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 50, maxLimit: 100 });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const storeRows = await Store.findAll({
      where: {
        isDeleted: false,
        isActive: true,
      },
      include: [
        {
          model: Product,
          as: "productDetails",
          where: { isDeleted: false },
          attributes: ["id", "name", "brand", "category", "DosageForms", "expiryDate", "unitPrice", "markup", "distributor"],
        },
      ],
    });

    const groupMap = new Map();
    for (const item of storeRows) {
      const prod = item.productDetails;
      if (!prod) continue;
      const key = productIdentityKey(prod);
      const isExpired = new Date(prod.expiryDate) <= today;
      const usableQty = isExpired ? 0 : item.quantity;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          productId: prod.id,
          name: prod.name,
          brand: prod.brand,
          category: prod.category,
          DosageForms: prod.DosageForms,
          onHand: 0,
          threshold: item.threshold || 10,
          unitCost: prod.unitPrice || 0,
          markup: prod.markup || 20,
          lastDistributor: prod.distributor,
        });
      }

      const grp = groupMap.get(key);
      grp.onHand += usableQty;
      grp.threshold = Math.max(grp.threshold, item.threshold || 10);
    }

    const suggestions = [];
    for (const g of groupMap.values()) {
      if (g.onHand <= g.threshold) {
        const suggestedQty = Math.max((g.threshold * 2) - g.onHand, Math.max(g.threshold, 1));
        const reason = g.onHand === 0 ? "out_of_stock" : "low_stock";
        suggestions.push({
          productId: g.productId,
          name: g.name,
          brand: g.brand,
          category: g.category,
          DosageForms: g.DosageForms,
          onHand: g.onHand,
          threshold: g.threshold,
          suggestedQty: Math.ceil(suggestedQty),
          unitCost: Math.round(g.unitCost * 100) / 100,
          markup: Math.round(g.markup),
          lastDistributor: g.lastDistributor,
          reason,
        });
      }
    }

    suggestions.sort((a, b) => a.onHand - b.onHand || a.name.localeCompare(b.name));
    const total = suggestions.length;
    const paginatedItems = suggestions.slice(skip, skip + limit);

    return res.status(200).json(paginated(paginatedItems, { page, limit, total }));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
