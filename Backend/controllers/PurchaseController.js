import Supplier from "../models/Supplier.js"
import PurchaseOrder from "../models/PurchaseOrder.js"
import Product from "../models/ProductModel.js"
import Store from "../models/StoreModel.js"
import Dispensary from "../models/DispensaryModel.js"
import Transfare from "../models/Transfer.js"
import { syncExpiryNotificationsInBackground } from "../services/notificationService.js"
import { getPagination, paginated, searchRegex } from "../utils/pagination.js"

function generateBatchNo() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let batchNo = ""
  for (let i = 0; i < 6; i++) {
    batchNo += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return batchNo
}

async function uniqueBatchNo() {
  for (let attempt = 0; attempt < 20; attempt++) {
    const batchNo = generateBatchNo()
    const existing = await Product.findOne({ batchNo, isDeleted: { $ne: true } })
    if (!existing) return batchNo
  }
  return `${generateBatchNo()}${Date.now().toString(36).slice(-2).toUpperCase()}`
}

async function nextOrderNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  const prefix = `PO-${stamp}-`
  const latest = await PurchaseOrder.findOne({ orderNumber: new RegExp(`^${prefix}`) })
    .sort({ orderNumber: -1 })
    .select("orderNumber")
    .lean()

  let seq = 1
  if (latest?.orderNumber) {
    const tail = Number.parseInt(String(latest.orderNumber).split("-").pop() || "0", 10)
    if (Number.isFinite(tail)) seq = tail + 1
  }
  return `${prefix}${String(seq).padStart(4, "0")}`
}

function recomputeStatus(order) {
  if (order.status === "cancelled") return "cancelled"
  const lines = order.lines || []
  if (lines.length === 0) return order.status === "ordered" ? "ordered" : "draft"

  const anyReceived = lines.some((line) => (line.quantityReceived || 0) > 0)
  const allReceived = lines.every((line) => (line.quantityReceived || 0) >= line.quantityOrdered)

  if (allReceived && anyReceived) return "received"
  if (anyReceived) return "partial"
  if (order.status === "ordered" || order.orderedAt) return "ordered"
  return "draft"
}

async function createStoreBatchFromLine({ line, supplier, userId, orderNumber }) {
  const qty = Number(line.receiveQty)
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error(`Invalid receive quantity for ${line.name}`)
  }

  const unitCost = Number(line.unitCost)
  if (!Number.isFinite(unitCost) || unitCost < 0) {
    throw new Error(`Invalid unit cost for ${line.name}`)
  }

  const markup = Number.isFinite(Number(line.markup)) ? Number(line.markup) : 20
  const batchNo = line.batchNo?.trim() || (await uniqueBatchNo())
  if (!line.expiryDate) {
    throw new Error(`Expiry date is required to receive ${line.name}`)
  }

  const existingBatch = await Product.findOne({ batchNo, isDeleted: { $ne: true } })
  if (existingBatch) {
    throw new Error(`Batch number ${batchNo} already exists`)
  }

  const brand = line.brand || "no_brand"
  const sellingPrice = unitCost * (1 + markup / 100)
  const product = new Product({
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
  })

  await product.save()
  await Store.updateStatus(product._id)
  await Dispensary.updateStatus(product._id)

  await Store.create({
    product: product._id,
    quantity: qty,
    initialStoreQty: qty,
    threshold: 10,
    isDeleted: false,
    isActive: true,
    type: "",
  })
  await Dispensary.create({
    product: product._id,
    quantity: 0,
    initialDispensaryQty: 0,
    threshold: 10,
    isDeleted: false,
    isActive: true,
    type: "",
  })

  await Transfare.create({
    product: product._id,
    user: userId,
    type: "PURCHASE_RECEIPT",
    UpdateType: "QUANTITY_ADDED",
    quantity: qty,
    quantityLeft: qty,
    totalQuantity: qty,
    unitPrice: unitCost,
    totalUnitPrice: unitCost * qty,
    notes: `PO ${orderNumber}`,
  })

  return product
}

// ─── Suppliers ───────────────────────────────────────────────────────────────

export async function ListSuppliers(req, res) {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const filter = { isDeleted: { $ne: true } }
    if (req.query.search) {
      const rx = searchRegex(req.query.search)
      filter.$or = [{ name: rx }, { contact: rx }, { email: rx }]
    }

    const [data, total] = await Promise.all([
      Supplier.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      Supplier.countDocuments(filter),
    ])

    return res.status(200).json(paginated(data, { page, limit, total }))
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export async function CreateSupplier(req, res) {
  try {
    const name = String(req.body.name || "").trim()
    if (!name) return res.status(400).json({ message: "Supplier name is required" })

    const supplier = await Supplier.create({
      name,
      contact: req.body.contact?.trim() || "",
      email: req.body.email?.trim() || "",
      address: req.body.address?.trim() || "",
      notes: req.body.notes?.trim() || "",
      createdBy: req.user._id,
    })

    return res.status(201).json({ message: "Supplier created", supplier })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export async function UpdateSupplier(req, res) {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
    if (!supplier) return res.status(404).json({ message: "Supplier not found" })

    const fields = ["name", "contact", "email", "address", "notes"]
    for (const field of fields) {
      if (req.body[field] !== undefined) supplier[field] = String(req.body[field]).trim()
    }
    if (!supplier.name) return res.status(400).json({ message: "Supplier name is required" })

    await supplier.save()
    return res.status(200).json({ message: "Supplier updated", supplier })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export async function DeleteSupplier(req, res) {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
    if (!supplier) return res.status(404).json({ message: "Supplier not found" })

    const openOrders = await PurchaseOrder.countDocuments({
      supplier: supplier._id,
      status: { $in: ["draft", "ordered", "partial"] },
    })
    if (openOrders > 0) {
      return res.status(400).json({
        message: "Cannot delete a supplier with open purchase orders",
        openOrders,
      })
    }

    supplier.isDeleted = true
    await supplier.save()
    return res.status(200).json({ message: "Supplier deleted" })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

// ─── Purchase orders ─────────────────────────────────────────────────────────

export async function ListPurchaseOrders(req, res) {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const filter = {}
    if (req.query.status) filter.status = req.query.status
    if (req.query.supplier) filter.supplier = req.query.supplier
    if (req.query.search) {
      filter.orderNumber = searchRegex(req.query.search)
    }

    const [data, total] = await Promise.all([
      PurchaseOrder.find(filter)
        .populate("supplier", "name contact email")
        .populate("createdBy", "name")
        .populate("receivedBy", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PurchaseOrder.countDocuments(filter),
    ])

    return res.status(200).json(paginated(data, { page, limit, total }))
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export async function GetPurchaseOrder(req, res) {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
      .populate("supplier", "name contact email address")
      .populate("createdBy", "name")
      .populate("receivedBy", "name")
      .lean()

    if (!order) return res.status(404).json({ message: "Purchase order not found" })
    return res.status(200).json({ order })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

function normalizeLines(rawLines = []) {
  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    throw new Error("At least one line item is required")
  }

  return rawLines.map((line, index) => {
    const name = String(line.name || "").trim()
    const quantityOrdered = Number(line.quantityOrdered)
    const unitCost = Number(line.unitCost)

    if (!name) throw new Error(`Line ${index + 1}: product name is required`)
    if (!Number.isFinite(quantityOrdered) || quantityOrdered < 1) {
      throw new Error(`Line ${index + 1}: quantity must be at least 1`)
    }
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      throw new Error(`Line ${index + 1}: unit cost is invalid`)
    }

    return {
      name,
      brand: String(line.brand || "no_brand").trim() || "no_brand",
      category: String(line.category || "").trim(),
      DosageForms: String(line.DosageForms || "").trim(),
      quantityOrdered,
      quantityReceived: 0,
      unitCost,
      markup: Number.isFinite(Number(line.markup)) ? Number(line.markup) : 20,
      batchNo: line.batchNo ? String(line.batchNo).trim() : undefined,
      expiryDate: line.expiryDate || undefined,
      notes: line.notes ? String(line.notes).trim() : undefined,
    }
  })
}

export async function CreatePurchaseOrder(req, res) {
  try {
    const supplierId = req.body.supplier
    if (!supplierId) return res.status(400).json({ message: "Supplier is required" })

    const supplier = await Supplier.findOne({ _id: supplierId, isDeleted: { $ne: true } })
    if (!supplier) return res.status(404).json({ message: "Supplier not found" })

    const lines = normalizeLines(req.body.lines)
    const place = Boolean(req.body.place)

    const order = await PurchaseOrder.create({
      orderNumber: await nextOrderNumber(),
      supplier: supplier._id,
      status: place ? "ordered" : "draft",
      lines,
      notes: req.body.notes?.trim() || "",
      expectedDate: req.body.expectedDate || undefined,
      orderedAt: place ? new Date() : undefined,
      createdBy: req.user._id,
    })

    const populated = await PurchaseOrder.findById(order._id)
      .populate("supplier", "name contact email")
      .populate("createdBy", "name")

    return res.status(201).json({
      message: place ? "Purchase order placed" : "Purchase order drafted",
      order: populated,
    })
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
}

export async function UpdatePurchaseOrder(req, res) {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
    if (!order) return res.status(404).json({ message: "Purchase order not found" })
    if (!["draft", "ordered"].includes(order.status)) {
      return res.status(400).json({ message: "Only draft or ordered POs can be edited" })
    }
    if ((order.lines || []).some((line) => (line.quantityReceived || 0) > 0)) {
      return res.status(400).json({ message: "Cannot edit a PO that has already received stock" })
    }

    if (req.body.supplier) {
      const supplier = await Supplier.findOne({ _id: req.body.supplier, isDeleted: { $ne: true } })
      if (!supplier) return res.status(404).json({ message: "Supplier not found" })
      order.supplier = supplier._id
    }

    if (req.body.lines) order.lines = normalizeLines(req.body.lines)
    if (req.body.notes !== undefined) order.notes = String(req.body.notes).trim()
    if (req.body.expectedDate !== undefined) {
      order.expectedDate = req.body.expectedDate || undefined
    }

    await order.save()
    const populated = await PurchaseOrder.findById(order._id)
      .populate("supplier", "name contact email")
      .populate("createdBy", "name")

    return res.status(200).json({ message: "Purchase order updated", order: populated })
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
}

export async function PlacePurchaseOrder(req, res) {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
    if (!order) return res.status(404).json({ message: "Purchase order not found" })
    if (order.status !== "draft") {
      return res.status(400).json({ message: "Only draft orders can be placed" })
    }
    if (!order.lines?.length) {
      return res.status(400).json({ message: "Add at least one line before placing" })
    }

    order.status = "ordered"
    order.orderedAt = new Date()
    await order.save()

    return res.status(200).json({ message: "Purchase order placed", order })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export async function CancelPurchaseOrder(req, res) {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
    if (!order) return res.status(404).json({ message: "Purchase order not found" })
    if (["received", "cancelled"].includes(order.status)) {
      return res.status(400).json({ message: `Cannot cancel a ${order.status} order` })
    }
    if ((order.lines || []).some((line) => (line.quantityReceived || 0) > 0)) {
      return res.status(400).json({
        message: "Cannot cancel after stock has been received — finish remaining lines or leave as partial",
      })
    }

    order.status = "cancelled"
    await order.save()
    return res.status(200).json({ message: "Purchase order cancelled", order })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

/**
 * Receive stock against ordered/partial PO lines.
 * Body: { lines: [{ lineId, receiveQty, batchNo?, expiryDate, unitCost?, markup? }] }
 */
export async function ReceivePurchaseOrder(req, res) {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
    if (!order) return res.status(404).json({ message: "Purchase order not found" })
    if (!["ordered", "partial"].includes(order.status)) {
      return res.status(400).json({ message: "Only ordered or partially received POs can be received" })
    }

    const supplier = await Supplier.findById(order.supplier)
    if (!supplier || supplier.isDeleted) {
      return res.status(400).json({ message: "Supplier is missing or deleted" })
    }

    const incoming = Array.isArray(req.body.lines) ? req.body.lines : []
    if (incoming.length === 0) {
      return res.status(400).json({ message: "Provide at least one line to receive" })
    }

    const createdProducts = []

    for (const item of incoming) {
      const line = order.lines.id(item.lineId)
      if (!line) {
        return res.status(400).json({ message: `Unknown line ${item.lineId}` })
      }

      const remaining = line.quantityOrdered - (line.quantityReceived || 0)
      const receiveQty = Number(item.receiveQty)
      if (!Number.isFinite(receiveQty) || receiveQty <= 0) {
        return res.status(400).json({ message: `Invalid receive qty for ${line.name}` })
      }
      if (receiveQty > remaining) {
        return res.status(400).json({
          message: `Cannot receive ${receiveQty} of ${line.name}; only ${remaining} remaining`,
        })
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
        userId: req.user._id,
        orderNumber: order.orderNumber,
      })

      line.quantityReceived = (line.quantityReceived || 0) + receiveQty
      line.receivedProduct = product._id
      if (item.batchNo) line.batchNo = String(item.batchNo).trim()
      if (item.expiryDate) line.expiryDate = new Date(item.expiryDate)
      if (item.unitCost !== undefined) line.unitCost = Number(item.unitCost)
      if (item.markup !== undefined) line.markup = Number(item.markup)

      createdProducts.push(product)
    }

    order.status = recomputeStatus(order)
    order.receivedBy = req.user._id
    if (order.status === "received") order.receivedAt = new Date()
    await order.save()

    if (createdProducts.length) {
      syncExpiryNotificationsInBackground(createdProducts)
    }

    const populated = await PurchaseOrder.findById(order._id)
      .populate("supplier", "name contact email")
      .populate("createdBy", "name")
      .populate("receivedBy", "name")

    return res.status(200).json({
      message: `Received ${createdProducts.length} batch(es) into store`,
      order: populated,
      products: createdProducts.map((p) => p._id),
    })
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
}

/**
 * Suggested reorders from store product-identity low / out-of-stock positions.
 */
export async function GetReorderSuggestions(req, res) {
  try {
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 50, maxLimit: 100 })
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [result] = await Store.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          isActive: true,
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "product",
          pipeline: [
            { $match: { isDeleted: { $ne: true } } },
            {
              $project: {
                name: 1,
                brand: 1,
                category: 1,
                DosageForms: 1,
                expiryDate: 1,
                unitPrice: 1,
                markup: 1,
                distributor: 1,
              },
            },
          ],
        },
      },
      { $unwind: "$product" },
      {
        $addFields: {
          _identity: {
            name: { $toLower: { $trim: { input: { $ifNull: ["$product.name", ""] } } } },
            brand: { $toLower: { $trim: { input: { $ifNull: ["$product.brand", "no_brand"] } } } },
            category: { $toLower: { $trim: { input: { $ifNull: ["$product.category", ""] } } } },
            DosageForms: {
              $toLower: { $trim: { input: { $ifNull: ["$product.DosageForms", ""] } } },
            },
          },
          usableQty: {
            $cond: [{ $lte: ["$product.expiryDate", today] }, 0, "$quantity"],
          },
        },
      },
      {
        $group: {
          _id: "$_identity",
          name: { $first: "$product.name" },
          brand: { $first: "$product.brand" },
          category: { $first: "$product.category" },
          DosageForms: { $first: "$product.DosageForms" },
          productId: { $first: "$product._id" },
          onHand: { $sum: "$usableQty" },
          threshold: { $max: "$threshold" },
          lastUnitCost: { $avg: "$product.unitPrice" },
          lastMarkup: { $avg: "$product.markup" },
          lastDistributor: { $last: "$product.distributor" },
        },
      },
      {
        $match: {
          $expr: { $lte: ["$onHand", "$threshold"] },
        },
      },
      {
        $addFields: {
          suggestedQty: {
            $max: [
              { $subtract: [{ $multiply: ["$threshold", 2] }, "$onHand"] },
              { $max: ["$threshold", 1] },
            ],
          },
          reason: {
            $cond: [{ $eq: ["$onHand", 0] }, "out_of_stock", "low_stock"],
          },
        },
      },
      {
        $facet: {
          data: [
            { $sort: { onHand: 1, name: 1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 0,
                productId: 1,
                name: 1,
                brand: 1,
                category: 1,
                DosageForms: 1,
                onHand: 1,
                threshold: 1,
                suggestedQty: { $ceil: "$suggestedQty" },
                unitCost: { $round: ["$lastUnitCost", 2] },
                markup: { $round: ["$lastMarkup", 0] },
                lastDistributor: 1,
                reason: 1,
              },
            },
          ],
          meta: [{ $count: "total" }],
        },
      },
    ])

    return res.status(200).json(
      paginated(result?.data || [], { page, limit, total: result?.meta?.[0]?.total || 0 }),
    )
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}
