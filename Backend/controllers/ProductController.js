import Product from "../models/ProductModel.js"
import Dispensary from "../models/DispensaryModel.js"
import Store from "../models/StoreModel.js"
import Transfare from "../models/Transfer.js"
import Sales from "../models/SalesModel.js"
import Notification from "../models/NotificationModel.js"
import {calculateInterdependentPrices} from "../helper/calculateInterdependentPrices.js"
import { getPagination, paginated, facetPage, readFacet, searchRegex } from "../utils/pagination.js"
import { syncExpiryNotifications, syncExpiryNotificationsInBackground } from "../services/notificationService.js"

/**
 * SINGLE-PRODUCT inventory helper (used after create/update to return one product).
 * Still does 2 queries but only for a single known product — acceptable.
 */
async function getInventoryData(productId) {
  const store = await Store.findOne({ product: productId, isDeleted: { $ne: true } }).lean()
  const dispensary = await Dispensary.findOne({ product: productId, isDeleted: { $ne: true } }).lean()

  return {
    store: store && store.isActive ? store.quantity : 0,
    dispensary: dispensary && dispensary.isActive ? dispensary.quantity : 0,
    storeThreshold: store ? store.threshold : 10,
    dispensaryThreshold: dispensary ? dispensary.threshold : 10,
    storeActive: store ? store.isActive : false,
    dispensaryActive: dispensary ? dispensary.isActive : false,
    storeExists: !!store,
    dispensaryExists: !!dispensary,
    storeStatus: store ? store.status : "Sold Out",
    dispensaryStatus: dispensary ? dispensary.status : "Sold Out",
    storeIsExpired: store ? store.isExpired : false,
    dispensaryIsExpired: dispensary ? dispensary.isExpired : false,
  }
}

/**
 * Kept for single-product responses (create/update endpoints).
 */
async function populateProductWithInventory(product) {
  if (!product) return null
  const inventory = await getInventoryData(product._id)
  const obj = product.toObject ? product.toObject() : product
  return { ...obj, inventory }
}

/**
 * The $lookup + $addFields stages that attach the two-location inventory block to
 * a product. Shared by every list endpoint so the shape is identical everywhere.
 */
const INVENTORY_JOIN_STAGES = [
  {
    $lookup: {
      from: "stores",
      localField: "_id",
      foreignField: "product",
      as: "storeData",
      pipeline: [{ $match: { isDeleted: { $ne: true } } }],
    },
  },
  {
    $lookup: {
      from: "dispensaries",
      localField: "_id",
      foreignField: "product",
      as: "dispensaryData",
      pipeline: [{ $match: { isDeleted: { $ne: true } } }],
    },
  },
  {
    $addFields: {
      _store: { $arrayElemAt: ["$storeData", 0] },
      _dispensary: { $arrayElemAt: ["$dispensaryData", 0] },
    },
  },
  {
    $addFields: {
      inventory: {
        store: { $cond: [{ $and: ["$_store", "$_store.isActive"] }, "$_store.quantity", 0] },
        dispensary: { $cond: [{ $and: ["$_dispensary", "$_dispensary.isActive"] }, "$_dispensary.quantity", 0] },
        storeThreshold: { $ifNull: ["$_store.threshold", 10] },
        dispensaryThreshold: { $ifNull: ["$_dispensary.threshold", 10] },
        storeActive: { $ifNull: ["$_store.isActive", false] },
        dispensaryActive: { $ifNull: ["$_dispensary.isActive", false] },
        storeExists: { $cond: [{ $ifNull: ["$_store", false] }, true, false] },
        dispensaryExists: { $cond: [{ $ifNull: ["$_dispensary", false] }, true, false] },
        storeStatus: { $ifNull: ["$_store.status", "Sold Out"] },
        dispensaryStatus: { $ifNull: ["$_dispensary.status", "Sold Out"] },
        storeIsExpired: { $ifNull: ["$_store.isExpired", false] },
        dispensaryIsExpired: { $ifNull: ["$_dispensary.isExpired", false] },
      },
    },
  },
  { $project: { storeData: 0, dispensaryData: 0, _store: 0, _dispensary: 0 } },
]

/**
 * BULK helper — replaces the N+1 pattern for list endpoints.
 *
 * One aggregation returns the requested page of products with their store and
 * dispensary inventory joined, plus the total row count. The location filter is
 * pushed into the pipeline (rather than pre-fetching every matching id and passing
 * an unbounded `$in` array, which is what this used to do).
 *
 * @returns {Promise<{data: Array, total: number}>}
 */
async function queryProductsWithInventory({
  match = {},
  location = null, // "store" | "dispensary" | null
  minQuantity = null, // filter on the location's quantity
  search,
  category,
  status,
  page = 1,
  limit = 25,
  skip = 0,
  sort = { createdAt: -1 },
}) {
  const productMatch = { ...match }

  if (category) productMatch.category = category
  if (search) {
    const rx = searchRegex(search)
    productMatch.$or = [{ name: rx }, { brand: rx }, { batchNo: rx }, { type: rx }]
  }

  const pipeline = [{ $match: productMatch }, ...INVENTORY_JOIN_STAGES]

  if (location) {
    const locationMatch = { [`inventory.${location}Active`]: true, [`inventory.${location}Exists`]: true }
    if (minQuantity !== null) locationMatch[`inventory.${location}`] = { $gte: minQuantity }
    pipeline.push({ $match: locationMatch })
  }

  if (status) {
    // Filter on the location-specific status when scoped to one location,
    // otherwise match a product where either location is in that state.
    pipeline.push({
      $match: location
        ? { [`inventory.${location}Status`]: status }
        : { $or: [{ "inventory.storeStatus": status }, { "inventory.dispensaryStatus": status }] },
    })
  }

  pipeline.push(...facetPage([{ $sort: sort }, { $skip: skip }, { $limit: limit }]))

  const result = await Product.aggregate(pipeline)
  return readFacet(result)
}

/** Parses the filter/pagination query string shared by the product list endpoints. */
function productListOptions(req) {
  const { page, limit, skip } = getPagination(req.query)
  const { search, category, status } = req.query
  return { page, limit, skip, search, category, status }
}

/**
 * Groups batches that share the same product identity
 * (name + brand + category + dosage form).
 *
 * Status is derived from the *combined* quantity at each location — a thin batch
 * must not mark the whole product Low Stock when sibling batches still hold plenty.
 */
async function queryGroupedProductsWithInventory({
  match = {},
  location = null, // "store" | "dispensary" | null
  minQuantity = null,
  search,
  category,
  status,
  page = 1,
  limit = 25,
  skip = 0,
}) {
  const productMatch = { ...match }

  if (category) productMatch.category = category
  if (search) {
    const rx = searchRegex(search)
    productMatch.$or = [{ name: rx }, { brand: rx }, { batchNo: rx }, { type: rx }]
  }

  const pipeline = [{ $match: productMatch }, ...INVENTORY_JOIN_STAGES]

  if (location) {
    const locationMatch = {
      [`inventory.${location}Active`]: true,
      [`inventory.${location}Exists`]: true,
    }
    if (minQuantity !== null) locationMatch[`inventory.${location}`] = { $gte: minQuantity }
    pipeline.push({ $match: locationMatch })
  }

  // Usable qty ignores expired lots so a dead batch cannot drag the product status down.
  const usableStore = {
    $cond: [{ $eq: ["$inventory.storeIsExpired", true] }, 0, "$inventory.store"],
  }
  const usableDispensary = {
    $cond: [{ $eq: ["$inventory.dispensaryIsExpired", true] }, 0, "$inventory.dispensary"],
  }

  pipeline.push(
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: {
          name: { $toLower: { $trim: { input: { $ifNull: ["$name", ""] } } } },
          brand: { $toLower: { $trim: { input: { $ifNull: ["$brand", "no_brand"] } } } },
          category: { $toLower: { $trim: { input: { $ifNull: ["$category", ""] } } } },
          DosageForms: { $toLower: { $trim: { input: { $ifNull: ["$DosageForms", ""] } } } },
        },
        name: { $first: "$name" },
        brand: { $first: "$brand" },
        category: { $first: "$category" },
        DosageForms: { $first: "$DosageForms" },
        type: { $first: "$type" },
        unitPrice: { $first: "$unitPrice" },
        sellingPrice: { $first: "$sellingPrice" },
        markup: { $first: "$markup" },
        storeTotal: { $sum: "$inventory.store" },
        dispensaryTotal: { $sum: "$inventory.dispensary" },
        storeUsable: { $sum: usableStore },
        dispensaryUsable: { $sum: usableDispensary },
        storeThreshold: { $max: "$inventory.storeThreshold" },
        dispensaryThreshold: { $max: "$inventory.dispensaryThreshold" },
        batchCount: { $sum: 1 },
        nearestExpiry: { $min: "$expiryDate" },
        batches: {
          $push: {
            _id: "$_id",
            name: "$name",
            brand: "$brand",
            category: "$category",
            DosageForms: "$DosageForms",
            type: "$type",
            batchNo: "$batchNo",
            expiryDate: "$expiryDate",
            quantity: "$quantity",
            unitPrice: "$unitPrice",
            sellingPrice: "$sellingPrice",
            markup: "$markup",
            totalPrice: "$totalPrice",
            totalSellingPrice: "$totalSellingPrice",
            distributor: "$distributor",
            visibility: "$visibility",
            inventory: "$inventory",
            createdAt: "$createdAt",
          },
        },
      },
    },
    {
      $addFields: {
        id: {
          $concat: [
            "$_id.name",
            "|",
            "$_id.brand",
            "|",
            "$_id.category",
            "|",
            "$_id.DosageForms",
          ],
        },
        totalQuantity: location
          ? location === "store"
            ? "$storeTotal"
            : "$dispensaryTotal"
          : { $add: ["$storeTotal", "$dispensaryTotal"] },
        storeStatus: {
          $switch: {
            branches: [
              { case: { $lte: ["$storeTotal", 0] }, then: "Sold Out" },
              { case: { $lte: ["$storeUsable", 0] }, then: "Expired" },
              {
                case: {
                  $lte: ["$storeUsable", { $ifNull: ["$storeThreshold", 10] }],
                },
                then: "Low Stock",
              },
            ],
            default: "In Stock",
          },
        },
        dispensaryStatus: {
          $switch: {
            branches: [
              { case: { $lte: ["$dispensaryTotal", 0] }, then: "Sold Out" },
              { case: { $lte: ["$dispensaryUsable", 0] }, then: "Expired" },
              {
                case: {
                  $lte: ["$dispensaryUsable", { $ifNull: ["$dispensaryThreshold", 10] }],
                },
                then: "Low Stock",
              },
            ],
            default: "In Stock",
          },
        },
      },
    },
  )

  // Status filter runs on the product total, not on any single thin batch.
  if (status) {
    pipeline.push({
      $match: location
        ? { [`${location}Status`]: status }
        : { $or: [{ storeStatus: status }, { dispensaryStatus: status }] },
    })
  }

  pipeline.push(
    // Drop groups that have nothing at the scoped location after summing.
    ...(location
      ? [
          {
            $match: {
              [location === "store" ? "storeTotal" : "dispensaryTotal"]: { $gt: 0 },
            },
          },
        ]
      : []),
    { $sort: { name: 1, brand: 1 } },
    ...facetPage([{ $skip: skip }, { $limit: limit }]),
  )

  const result = await Product.aggregate(pipeline)
  const { data, total } = readFacet(result)

  const shaped = data.map((group) => {
    const batches = [...(group.batches || [])].sort((a, b) => {
      const aTime = a.expiryDate ? new Date(a.expiryDate).getTime() : Number.POSITIVE_INFINITY
      const bTime = b.expiryDate ? new Date(b.expiryDate).getTime() : Number.POSITIVE_INFINITY
      return aTime - bTime
    })

    return {
      id: group.id,
      name: group.name,
      brand: group.brand,
      category: group.category,
      DosageForms: group.DosageForms,
      type: group.type,
      unitPrice: group.unitPrice,
      sellingPrice: group.sellingPrice,
      markup: group.markup,
      batchCount: group.batchCount,
      nearestExpiry: group.nearestExpiry,
      totalQuantity: group.totalQuantity,
      inventory: {
        store: group.storeTotal,
        dispensary: group.dispensaryTotal,
        storeThreshold: group.storeThreshold ?? 10,
        dispensaryThreshold: group.dispensaryThreshold ?? 10,
        storeActive: group.storeTotal > 0,
        dispensaryActive: group.dispensaryTotal > 0,
        storeExists: true,
        dispensaryExists: true,
        storeStatus: group.storeStatus,
        dispensaryStatus: group.dispensaryStatus,
        storeIsExpired: group.storeStatus === "Expired",
        dispensaryIsExpired: group.dispensaryStatus === "Expired",
      },
      batches,
    }
  })

  return { data: shaped, total }
}

export async function GetGroupedProducts(req, res) {
  try {
    const options = productListOptions(req)
    const { data, total } = await queryGroupedProductsWithInventory({
      ...options,
      match: { visibility: "enable", isDeleted: { $ne: true } },
    })
    return res.json(paginated(data, { page: options.page, limit: options.limit, total }))
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export async function GetGroupedStoreProducts(req, res) {
  try {
    const options = productListOptions(req)
    const { data, total } = await queryGroupedProductsWithInventory({
      ...options,
      match: { isDeleted: { $ne: true } },
      location: "store",
    })
    return res.json(paginated(data, { page: options.page, limit: options.limit, total }))
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export async function GetGroupedDispensaryProducts(req, res) {
  try {
    const options = productListOptions(req)
    const { data, total } = await queryGroupedProductsWithInventory({
      ...options,
      match: { isDeleted: { $ne: true } },
      location: "dispensary",
    })
    return res.json(paginated(data, { page: options.page, limit: options.limit, total }))
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

/** POS catalogue: grouped sellable shelf stock (dispensary qty ≥ 1). */
export async function GetGroupedSellableProducts(req, res) {
  try {
    const options = productListOptions(req)
    const { data, total } = await queryGroupedProductsWithInventory({
      ...options,
      match: { isDeleted: { $ne: true }, visibility: "enable" },
      location: "dispensary",
      minQuantity: 1,
    })
    return res.json(paginated(data, { page: options.page, limit: options.limit, total }))
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}


 export async function CreateProductInDispensary(req, res) {
  try {
    const userId = req.user._id
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
      storeThreshold,
      dispensaryThreshold,
      type,
    } = req.body

// 1. Generate batch number if not provided
       if (!batchNo) {
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let isUnique = false;
      while (!isUnique) {
        batchNo = '';
        for (let i = 0; i < 8; i++) {
          batchNo += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        
        // Check if batch number already exists
        const existingProduct = await Product.findOne({ 
          batchNo, 
          isDeleted: { $ne: true } 
        });
        isUnique = !existingProduct;
      }
    }
// 2. Set default distributor if not provided
    if (!distributor || !distributor.name || !distributor.contact) {
      distributor = {
        name: "Unknown",
        contact: "0000000000"
      };
    }

    // 3. Calculate unit price if not provided but sellingPrice and markup are available
    if (!unitPrice && sellingPrice && markup) {
       const markupPercentage = markup / 100;
       const calculatedUnitPrice = sellingPrice / (1 + markupPercentage); // Use new variable
        unitPrice = calculatedUnitPrice; 
    } else if (!unitPrice) {
      return res.status(400).json({ 
        message: "Unit price is required, or provide sellingPrice and markup to calculate it" 
      });
    }
    const productBrand = brand || "no_brand"
    const productDosageForms = DosageForms || ""
    const productType = type || ""
    const storeThresholdValue = storeThreshold !== undefined ? storeThreshold : 10
    const dispensaryThresholdValue = dispensaryThreshold !== undefined ? dispensaryThreshold : 10

    const newProductData = {
      addedBy: userId,
      name,
      brand: productBrand,
      unitPrice,
      quantity,
      totalPrice: unitPrice * quantity,
      batchNo,
      expiryDate,
      markup,
      sellingPrice: unitPrice * (1 + markup / 100),
      totalSellingPrice: unitPrice * (1 + markup / 100) * quantity,
      DosageForms: productDosageForms,
      category,
      distributor,
      isDeleted: false,
      visibility: "enable",
      type: productType,
      // Do NOT add threshold here
    }

    const newProduct = new Product(newProductData)
    await newProduct.save()
    await Store.updateStatus(newProduct._id);
    await Dispensary.updateStatus(newProduct._id);

    // Create store and dispensary records with their own thresholds
    await Dispensary.create({
      product: newProduct._id,
      quantity: quantity,
      initialDispensaryQty: quantity,
      threshold: dispensaryThresholdValue,
      isDeleted: false,
      isActive: true,
      type: productType,
    })
    await Store.create({
      product: newProduct._id,
      quantity: 0,
      initialStoreQty: 0,
      threshold: storeThresholdValue,
      isDeleted: false,
      isActive: true,
      type: productType,
    })

    syncExpiryNotificationsInBackground([newProduct])

    const productWithInventory = await populateProductWithInventory(newProduct)
    return res.status(201).json({
      message: "New product added successfully",
      Product: productWithInventory,
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}
export async function CreateProduct(req, res) {
  try {
    const userId = req.user._id
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
      storeThreshold,
      dispensaryThreshold,
      sellingPrice,
      type,
    } = req.body
     // 1. Generate batch number if not provided
    if (!batchNo) {
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let isUnique = false;
      
      while (!isUnique) {
        batchNo = '';
        for (let i = 0; i < 6; i++) {
          batchNo += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        
        // Check if batch number already exists
        const existingProduct = await Product.findOne({ 
          batchNo, 
          isDeleted: { $ne: true } 
        });
        isUnique = !existingProduct;
      }
    }

    // 2. Set default distributor if not provided
    if (!distributor || !distributor.name || !distributor.contact) {
      distributor = {
        name: "Unknown",
        contact: "0000000000"
      };
    }

    // 3. Calculate unit price if not provided but sellingPrice and markup are available
    if (!unitPrice && sellingPrice && markup) {
      const markupPercentage = markup / 100;
      const calculatedUnitPrice = sellingPrice / (1 + markupPercentage); // Use new variable
     unitPrice = calculatedUnitPrice; 
    } else if (!unitPrice) {
      return res.status(400).json({ 
        message: "Unit price is required, or provide sellingPrice and markup to calculate it" 
      });
    }
    const productBrand = brand || "no_brand"
    const productDosageForms = DosageForms || ""
    const productType = type || ""
    const storeThresholdValue = storeThreshold !== undefined ? storeThreshold : 10
    const dispensaryThresholdValue = dispensaryThreshold !== undefined ? dispensaryThreshold : 10
    
    const newProductData = {
      addedBy: userId,
      name,
      brand: productBrand,
      unitPrice,
      quantity,
      totalPrice: unitPrice * quantity,
      batchNo,
      expiryDate,
      markup,
      sellingPrice: unitPrice * (1 + markup / 100),
      totalSellingPrice: unitPrice * (1 + markup / 100) * quantity,
      DosageForms: productDosageForms,
      category,
      distributor,
      isDeleted: false,
      visibility: "enable",
      type: productType,
      // Do NOT add threshold here
    }
    const newProduct = new Product(newProductData)
    await newProduct.save()
    await Store.updateStatus(newProduct._id);
    await Dispensary.updateStatus(newProduct._id);

    // Create store and dispensary records with their own thresholds
    await Store.create({
      product: newProduct._id,
      quantity: quantity,
      initialStoreQty: quantity,
      threshold: storeThresholdValue,
      isDeleted: false,
      isActive: true,
      type: productType,
    })
    await Dispensary.create({
      product: newProduct._id,
      quantity: 0,
      initialDispensaryQty: 0,
      threshold: dispensaryThresholdValue,
      isDeleted: false,
      isActive: true,
      type: productType,
    })

    syncExpiryNotificationsInBackground([newProduct])

    const productWithInventory = await populateProductWithInventory(newProduct)
    return res.status(201).json({
      message: "New product added successfully",
      Product: productWithInventory,
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export async function SmartDeleteProduct(req, res) {
  try {
    const productId = req.params.id
    const userId = req.user._id

    const product = await Product.findById(productId)
    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }
    if (product.isDeleted) {
      return res.status(400).json({ message: "Product is already deleted" })
    }

    // Check for references
    const salesCount = await Sales.countDocuments({ product: productId })
    const transferCount = await Transfare.countDocuments({ product: productId })
    const totalReferences = salesCount + transferCount

    if (totalReferences > 0) {
      // Perform SOFT DELETE - Product has references
      const deletedProduct = await Product.findByIdAndUpdate(
        productId,
        {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: userId,
          visibility: "deleted",
        },
        { new: true },
      )

      // Also soft delete related inventory records
      await Store.findOneAndUpdate(
        { product: productId },
        {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: userId,
          isActive: false,
        },
      )
      await Dispensary.findOneAndUpdate(
        { product: productId },
        {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: userId,
          isActive: false,
        },
      )
      await Store.updateStatus(productId);
      await Dispensary.updateStatus(productId);
      return res.status(200).json({
        message: "Product soft deleted successfully (has references)",
        deleteType: "soft",
        product: deletedProduct,
        references: {
          sales: salesCount,
          transfers: transferCount,
          total: totalReferences,
        },
        reason: "Product has sales or transfer records and cannot be permanently deleted",
      })
    } else {
      // Perform HARD DELETE - Product has no references
      await Product.findByIdAndDelete(productId)
      // Clean up related data completely
      await Store.deleteOne({ product: productId })
      await Dispensary.deleteOne({ product: productId })
      await Notification.deleteMany({ product: productId })

      return res.status(200).json({
        message: "Product permanently deleted successfully (no references)",
        deleteType: "hard",
        productId: productId,
        references: {
          sales: 0,
          transfers: 0,
          total: 0,
        },
        reason: "Product had no sales or transfer records and was safely removed",
      })
    }
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export async function HardDeleteProduct(req, res) {
  try {
    const productId = req.params.id
    const product = await Product.findById(productId)
    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    // Check for references before hard delete
    const salesCount = await Sales.countDocuments({ product: productId })
    const transferCount = await Transfare.countDocuments({ product: productId })
    if (salesCount > 0 || transferCount > 0) {
      return res.status(400).json({
        message: `Cannot permanently delete product. It has ${salesCount} sales records and ${transferCount} transfer records. Use soft delete instead.`,
        salesCount,
        transferCount,
      })
    }

    // Proceed with hard delete
    await Product.findByIdAndDelete(productId)
    await Store.deleteOne({ product: productId })
    await Dispensary.deleteOne({ product: productId })
    await Notification.deleteMany({ product: productId })

    return res.status(200).json({
      message: "Product permanently deleted successfully",
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export async function UpdateProduct(req, res) {
  try {
    const productId = req.params.id;
    const userId = req.user._id;
    let updates = { ...req.body };
    if (updates.distributor) {
      if (!updates.distributor.name) {
        updates.distributor.name = "Unknown";
      }
      if (!updates.distributor.contact) {
        updates.distributor.contact = "0000000000";
      }
    }

    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    } 
    updates = calculateInterdependentPrices(existingProduct, updates);
    if (!updates.brand && updates.type === "medicine") {
      updates.brand = "no_brand";
    }
    // Get current inventory data before updates
    const oldInventory = await getInventoryData(productId);

    if (updates.distributor) {
      if (!updates.distributor.name || !updates.distributor.contact) {
        return res.status(400).json({
          message: "Distributor must include name and contact",
        });
      }
    }

    // Handle quantity changes
    if (updates.quantity !== undefined) {
      const dispensary = await Dispensary.findOne({ product: productId });
      const currentDispensaryQty = dispensary ? dispensary.quantity : 0;
      const newTotalQuantity = updates.quantity;

      if (newTotalQuantity < currentDispensaryQty) {
        return res.status(400).json({
          message: `Total quantity cannot be less than dispensary stock (${currentDispensaryQty})`,
        });
      }

      // Calculate store quantity change
      const newStoreQty = newTotalQuantity - currentDispensaryQty;
      const oldStoreQty = oldInventory.store;
      const storeQuantityChange = newStoreQty - oldStoreQty;

      // Update store quantity
      await Store.findOneAndUpdate(
        { product: productId },
        { quantity: newStoreQty },
        { upsert: true, new: true },
      );

      // Create transfer record for store quantity change
      if (storeQuantityChange !== 0) {
        const updateType = storeQuantityChange > 0 ? "QUANTITY_ADDED" : "QUANTITY_DEDUCTED";
        const transfer = new Transfare({
          product: productId,
          user: userId,
          type: "UPDATED_IN_STORE",
          UpdateType: updateType,
          quantity: Math.abs(storeQuantityChange),
          quantityLeft: newStoreQty,
          totalQuantity: newTotalQuantity,
          unitPrice: existingProduct.unitPrice,
          totalUnitPrice: existingProduct.unitPrice * Math.abs(storeQuantityChange),
        });
        await transfer.save();
      }
    }

    // Handle threshold updates
    if (updates.storeThreshold !== undefined) {
      await Store.findOneAndUpdate(
        { product: productId },
        { threshold: updates.storeThreshold },
        { upsert: true, new: true }
      );
    }
    if (updates.dispensaryThreshold !== undefined) {
      await Dispensary.findOneAndUpdate(
        { product: productId },
        { threshold: updates.dispensaryThreshold },
        { upsert: true, new: true }
      );
    }

    // Recalculate prices if relevant fields change
    const unitPrice = updates.unitPrice !== undefined ? updates.unitPrice : existingProduct.unitPrice;
    const quantity = updates.quantity !== undefined ? updates.quantity : existingProduct.quantity;
    const markup = updates.markup !== undefined ? updates.markup : existingProduct.markup;

    if (updates.unitPrice !== undefined || updates.quantity !== undefined || updates.markup !== undefined) {
      updates.totalPrice = unitPrice * quantity;
      updates.sellingPrice = unitPrice * (1 + markup / 100);
      updates.totalSellingPrice = updates.sellingPrice * quantity;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $set: updates },
      { new: true, runValidators: true },
    );
    
    await Store.updateStatus(productId);
    await Dispensary.updateStatus(productId);

    syncExpiryNotificationsInBackground([updatedProduct]);

    const productWithInventory = await populateProductWithInventory(updatedProduct);
    
    return res.status(200).json({
      message: "Product updated successfully",
      product: productWithInventory,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function DeleteFromDispensary(req, res) {
  try {
    const productId = req.params.id
    const userId = req.user._id

    const product = await Product.findById(productId)
    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    const dispensary = await Dispensary.findOne({ product: productId })
    if (!dispensary) {
      return res.status(404).json({ message: "Product not found in dispensary" })
    }
    if (dispensary.isDeleted) {
      return res.status(400).json({ message: "Product is already deleted from dispensary" })
    }

    // Check if there are any pending sales from dispensary
    const pendingSales = await Sales.countDocuments({
      product: productId,
      status: "pending",
    })
    if (pendingSales > 0) {
      return res.status(400).json({
        message: `Cannot delete from dispensary. There are ${pendingSales} pending sales for this product.`,
      })
    }

    // Calculate new total quantity
    const dispensaryQuantity = dispensary.quantity;
    const newTotalQuantity = product.quantity - dispensaryQuantity;

    // Update product quantity first
    await Product.findByIdAndUpdate(
      productId,
      { quantity: newTotalQuantity },
      { new: true }
    );

    // Then soft delete from dispensary
    await Dispensary.findOneAndUpdate(
      { product: productId },
      {
        deletedAt: new Date(),
        deletedBy: userId,
        quantity: 0,
      },
      { new: true }
    );

    // Update status for both locations
    await Dispensary.updateStatus(productId);
    await Store.updateStatus(productId);

    // Check if product should be completely deleted
    const store = await Store.findOne({ product: productId, isDeleted: { $ne: true } })
    if (!store || store.isDeleted) {
      await Product.findByIdAndUpdate(productId, {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
        visibility: "deleted",
      })
    }

    // Clean up notifications
    await Notification.deleteMany({
      product: productId,
      location: "dispensary",
    })

    const updatedProduct = await Product.findById(productId)
    const productWithInventory = await populateProductWithInventory(updatedProduct)
    return res.status(200).json({
      message: "Product deleted from dispensary successfully",
      product: productWithInventory,
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export async function IssueToDispensary(req, res) {
  try {
    const userId = req.user._id
    const { productId, quantity } = req.body

    const product = await Product.findOne({ _id: productId, isDeleted: { $ne: true } })
    if (!product) {
      return res.status(404).json({ message: "Product not found or has been deleted" })
    }

    const store = await Store.findOne({ product: productId, isDeleted: { $ne: true }, isActive: true })
    if (!store || store.quantity < quantity) {
      return res.status(400).json({
        message: `Insufficient stock in store or store is inactive. Available: ${store ? store.quantity : 0}`,
      })
    }

    const dispensary = await Dispensary.findOne({ product: productId })
    if (!dispensary || dispensary.isDeleted || !dispensary.isActive) {
      return res.status(400).json({
        message: "Dispensary location is not active for this product",
      })
    }

    // Update quantities
    await Store.findOneAndUpdate({ product: productId }, { $inc: { quantity: -quantity } }, { new: true })
    await Dispensary.findOneAndUpdate({ product: productId }, { $inc: { quantity: quantity } }, { new: true })
    await Store.updateStatus(productId);
    await Dispensary.updateStatus(productId);
    // Create transfer record
    const transfare = new Transfare({
      product: productId,
      user: userId,
      type: "ISSUE_TO_DISPENSARY",
      quantity: quantity,
      quantityLeft: store.quantity - quantity, // This will be the quantity in store AFTER transfer
      totalQuantity: product.quantity,
      issuedPrice: product.sellingPrice,
      unitPrice: product.unitPrice,
      totalIssuedPrice: product.sellingPrice * quantity,
      totalUnitPrice: product.unitPrice * quantity,
    })
    await transfare.save()

    const updatedInventory = await getInventoryData(productId)
    return res.json({
      message: "Product issued to dispensary successfully",
      updatedInventory,
      transfareId: transfare._id,
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export async function ReturnToStore(req, res) {
  try {
    const userId = req.user._id
    const { productId, quantity } = req.body

    const product = await Product.findById(productId)
    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    const dispensary = await Dispensary.findOne({ product: productId })
    if (!dispensary || dispensary.quantity < quantity) {
      return res.status(400).json({
        message: `Insufficient stock in dispensary. Available: ${dispensary ? dispensary.quantity : 0}`,
      })
    }

    // Update quantities
    await Dispensary.findOneAndUpdate({ product: productId }, { $inc: { quantity: -quantity } }, { new: true })
    await Store.findOneAndUpdate({ product: productId }, { $inc: { quantity: quantity } }, { upsert: true, new: true })
    await Store.updateStatus(productId);
    await Dispensary.updateStatus(productId);
    // Create transfer record
    const transfare = new Transfare({
      product: productId,
      user: userId,
      type: "RETURN_TO_STORE",
      quantity: quantity,
      quantityLeft: dispensary.quantity - quantity, // This will be the quantity in dispensary AFTER transfer
      totalQuantity: product.quantity,
      issuedPrice: product.sellingPrice,
      unitPrice: product.unitPrice,
      totalIssuedPrice: product.sellingPrice * quantity,
      totalUnitPrice: product.unitPrice * quantity,
    })
    await transfare.save()

    const updatedInventory = await getInventoryData(productId)
    return res.json({
      message: "Product returned to store successfully",
      updatedInventory,
      transfareId: transfare._id,
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

/** Shared paginated reader for the two directional transfer-history screens. */
async function listTransfers(req, res, type) {
  const { page, limit, skip } = getPagination(req.query)

  const [history, total] = await Promise.all([
    Transfare.find({ type })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "name email role")
      .populate("product", "name brand batchNo expiryDate unitPrice sellingPrice category")
      .lean(),
    Transfare.countDocuments({ type }),
  ])

  return res.json(paginated(history, { page, limit, total }))
}

export async function GetIssuedDispensary(req, res) {
  try {
    return await listTransfers(req, res, "ISSUE_TO_DISPENSARY")
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export async function GetReturnToStore(req, res) {
  try {
    return await listTransfers(req, res, "RETURN_TO_STORE")
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export async function GetAllProducts(req, res) {
  try {
    const options = productListOptions(req)
    const { data, total } = await queryProductsWithInventory({
      ...options,
      match: { visibility: "enable", isDeleted: { $ne: true } },
    })
    return res.json(paginated(data, { page: options.page, limit: options.limit, total }))
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export async function GetStoreProduct(req, res) {
  try {
    const options = productListOptions(req)
    const { data, total } = await queryProductsWithInventory({
      ...options,
      match: { isDeleted: { $ne: true } },
      location: "store",
      minQuantity: 0,
    })
    return res.json(paginated(data, { page: options.page, limit: options.limit, total }))
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export async function GetDispensaryProduct(req, res) {
  try {
    const options = productListOptions(req)
    const { data, total } = await queryProductsWithInventory({
      ...options,
      match: { isDeleted: { $ne: true } },
      location: "dispensary",
      minQuantity: 0,
    })
    return res.json(paginated(data, { page: options.page, limit: options.limit, total }))
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export async function GetDispensaryProductToSell(req, res) {
  try {
    const options = productListOptions(req)
    const { data, total } = await queryProductsWithInventory({
      ...options,
      match: { isDeleted: { $ne: true }, visibility: "enable" },
      location: "dispensary",
      minQuantity: 1,
      sort: { name: 1 },
    })
    return res.json(paginated(data, { page: options.page, limit: options.limit, total }))
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}
export async function GetCountedStore(req, res) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const results = await Store.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: "$productInfo" },
      {
        $match: {
          quantity: { $gt: 0 },
          isDeleted: false,
          isActive: true,
          "productInfo.isDeleted": { $ne: true },
        },
      },
      {
        $addFields: {
          inventoryValue: { $multiply: ["$productInfo.unitPrice", "$quantity"] },
          sellingValue: { $multiply: ["$productInfo.sellingPrice", "$quantity"] },
          usableQty: {
            $cond: [{ $lte: ["$productInfo.expiryDate", today] }, 0, "$quantity"],
          },
          isExpiredBatch: {
            $and: [{ $lte: ["$productInfo.expiryDate", today] }, { $gt: ["$quantity", 0] }],
          },
          _identity: {
            name: { $toLower: { $trim: { input: { $ifNull: ["$productInfo.name", ""] } } } },
            brand: { $toLower: { $trim: { input: { $ifNull: ["$productInfo.brand", "no_brand"] } } } },
            category: { $toLower: { $trim: { input: { $ifNull: ["$productInfo.category", ""] } } } },
            DosageForms: { $toLower: { $trim: { input: { $ifNull: ["$productInfo.DosageForms", ""] } } } },
          },
        },
      },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalInStore: { $sum: 1 },
                expiredInStore: { $sum: { $cond: ["$isExpiredBatch", 1, 0] } },
                totalInventoryValue: { $sum: "$inventoryValue" },
                totalSellingValue: { $sum: "$sellingValue" },
                potentialProfit: {
                  $sum: { $subtract: ["$sellingValue", "$inventoryValue"] },
                },
              },
            },
          ],
          lowProducts: [
            {
              $group: {
                _id: "$_identity",
                usable: { $sum: "$usableQty" },
                threshold: { $max: "$threshold" },
              },
            },
            {
              $match: {
                usable: { $gt: 0 },
                $expr: { $lte: ["$usable", "$threshold"] },
              },
            },
            { $count: "lowInStore" },
          ],
        },
      },
    ])

    const facet = results[0] || { totals: [], lowProducts: [] }
    const totals = facet.totals[0] || {
      totalInStore: 0,
      expiredInStore: 0,
      totalInventoryValue: 0,
      totalSellingValue: 0,
      potentialProfit: 0,
    }

    const outOfStockCount = await Store.countDocuments({
      quantity: 0,
      isDeleted: false,
      isActive: true,
    })

    res.json({
      ...totals,
      lowInStore: facet.lowProducts[0]?.lowInStore || 0,
      outOfStockInStore: outOfStockCount,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export async function GetCountedDispensary(req, res) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const results = await Dispensary.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: "$productInfo" },
      {
        $match: {
          quantity: { $gt: 0 },
          isDeleted: false,
          isActive: true,
          "productInfo.isDeleted": { $ne: true },
        },
      },
      {
        $addFields: {
          inventoryValue: { $multiply: ["$productInfo.unitPrice", "$quantity"] },
          sellingValue: { $multiply: ["$productInfo.sellingPrice", "$quantity"] },
          usableQty: {
            $cond: [{ $lte: ["$productInfo.expiryDate", today] }, 0, "$quantity"],
          },
          isExpiredBatch: {
            $and: [{ $lte: ["$productInfo.expiryDate", today] }, { $gt: ["$quantity", 0] }],
          },
          _identity: {
            name: { $toLower: { $trim: { input: { $ifNull: ["$productInfo.name", ""] } } } },
            brand: { $toLower: { $trim: { input: { $ifNull: ["$productInfo.brand", "no_brand"] } } } },
            category: { $toLower: { $trim: { input: { $ifNull: ["$productInfo.category", ""] } } } },
            DosageForms: { $toLower: { $trim: { input: { $ifNull: ["$productInfo.DosageForms", ""] } } } },
          },
        },
      },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalInDispensary: { $sum: 1 },
                expiredInDispensary: { $sum: { $cond: ["$isExpiredBatch", 1, 0] } },
                totalInventoryValue: { $sum: "$inventoryValue" },
                totalSellingValue: { $sum: "$sellingValue" },
                potentialProfit: {
                  $sum: { $subtract: ["$sellingValue", "$inventoryValue"] },
                },
              },
            },
          ],
          lowProducts: [
            {
              $group: {
                _id: "$_identity",
                usable: { $sum: "$usableQty" },
                threshold: { $max: "$threshold" },
              },
            },
            {
              $match: {
                usable: { $gt: 0 },
                $expr: { $lte: ["$usable", "$threshold"] },
              },
            },
            { $count: "lowInDispensary" },
          ],
        },
      },
    ])

    const facet = results[0] || { totals: [], lowProducts: [] }
    const totals = facet.totals[0] || {
      totalInDispensary: 0,
      expiredInDispensary: 0,
      totalInventoryValue: 0,
      totalSellingValue: 0,
      potentialProfit: 0,
    }

    const outOfStockCount = await Dispensary.countDocuments({
      quantity: 0,
      isDeleted: false,
      isActive: true,
    })

    res.json({
      ...totals,
      lowInDispensary: facet.lowProducts[0]?.lowInDispensary || 0,
      outOfStockInDispensary: outOfStockCount,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export async function CountAllProduct(req, res) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const nearExpiryCutoff = new Date(today)
    nearExpiryCutoff.setMonth(nearExpiryCutoff.getMonth() + 3)

    // Two independent rollups over the same match. Doing this as a $facet keeps
    // the per-category counts in their own $group instead of pushing every
    // product document into a single array (which hits the 16MB group cap once
    // the catalog gets large).
    const [stats = {}] = await Product.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          visibility: "enable",
        },
      },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalProducts: { $sum: 1 },
                totalQuantity: { $sum: "$quantity" },
                totalValue: { $sum: "$totalPrice" },
                totalSellingValue: { $sum: { $multiply: ["$sellingPrice", "$quantity"] } },
                nearExpiry: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $gt: ["$expiryDate", today] },
                          { $lte: ["$expiryDate", nearExpiryCutoff] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                expiredCount: {
                  $sum: { $cond: [{ $lte: ["$expiryDate", today] }, 1, 0] },
                },
              },
            },
          ],
          byCategory: [
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $project: { _id: 0, category: "$_id", count: 1 } },
          ],
        },
      },
    ])

    const totals = stats.totals?.[0] || {}
    const totalValue = totals.totalValue || 0
    const totalSellingValue = totals.totalSellingValue || 0

    return res.json({
      totalProducts: totals.totalProducts || 0,
      totalQuantity: totals.totalQuantity || 0,
      totalValue,
      totalSellingValue,
      potentialProfit: totalSellingValue - totalValue,
      nearExpiry: totals.nearExpiry || 0,
      expiredCount: totals.expiredCount || 0,
      byCategory: stats.byCategory || [],
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}
/**
 * Bulk product import.
 *
 * Deliberately avoids `new Product().save()` per row: `insertMany` does not fire
 * `save` middleware, the Store/Dispensary rows go in as one `insertMany` each, and
 * expiry notifications for the whole batch collapse into a single `bulkWrite`.
 * Importing 500 products costs a handful of round-trips instead of ~2000.
 */
export async function BulkImportProducts(req, res) {
  try {
    const userId = req.user._id
    const { products } = req.body

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "`products` must be a non-empty array" })
    }
    if (products.length > 1000) {
      return res.status(400).json({ message: "Import is capped at 1000 products per request" })
    }

    const errors = []
    const productDocs = []
    const thresholds = []

    products.forEach((row, index) => {
      const { name, quantity, expiryDate, markup, category } = row
      let { unitPrice, sellingPrice, batchNo, distributor } = row

      if (!name || quantity === undefined || !expiryDate) {
        errors.push({ index, message: "name, quantity and expiryDate are required" })
        return
      }
      if (unitPrice === undefined && sellingPrice !== undefined && markup !== undefined) {
        unitPrice = sellingPrice / (1 + markup / 100)
      }
      if (unitPrice === undefined) {
        errors.push({ index, message: "unitPrice is required, or supply sellingPrice and markup" })
        return
      }

      const resolvedMarkup = markup ?? 0
      const resolvedSelling = unitPrice * (1 + resolvedMarkup / 100)
      if (!distributor?.name || !distributor?.contact) {
        distributor = { name: distributor?.name || "Unknown", contact: distributor?.contact || "0000000000" }
      }

      productDocs.push({
        addedBy: userId,
        name,
        brand: row.brand || "no_brand",
        unitPrice,
        quantity,
        totalPrice: unitPrice * quantity,
        batchNo: batchNo || undefined,
        expiryDate,
        markup: resolvedMarkup,
        sellingPrice: resolvedSelling,
        totalSellingPrice: resolvedSelling * quantity,
        DosageForms: row.DosageForms || "",
        category,
        distributor,
        type: row.type || "",
        isDeleted: false,
        visibility: "enable",
      })
      thresholds.push({
        store: row.storeThreshold ?? 10,
        dispensary: row.dispensaryThreshold ?? 10,
        type: row.type || "",
      })
    })

    if (productDocs.length === 0) {
      return res.status(400).json({ message: "No valid rows to import", errors })
    }

    // Fill in any missing batch numbers, checking the whole batch against the DB at once.
    const generated = new Set()
    const needsBatchNo = productDocs.filter((doc) => !doc.batchNo)
    if (needsBatchNo.length > 0) {
      const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
      const makeCandidate = () =>
        Array.from({ length: 8 }, () => characters.charAt(Math.floor(Math.random() * characters.length))).join("")

      while (generated.size < needsBatchNo.length) generated.add(makeCandidate())
      let candidates = [...generated]

      const taken = new Set(
        (await Product.find({ batchNo: { $in: candidates }, isDeleted: { $ne: true } }, { batchNo: 1 }).lean()).map(
          (p) => p.batchNo,
        ),
      )
      candidates = candidates.filter((c) => !taken.has(c))
      while (candidates.length < needsBatchNo.length) candidates.push(makeCandidate())

      needsBatchNo.forEach((doc, i) => {
        doc.batchNo = candidates[i]
      })
    }

    // `insertMany` bypasses `save` middleware, which is the whole point here.
    const inserted = await Product.insertMany(productDocs, { ordered: false })

    const storeRows = []
    const dispensaryRows = []
    inserted.forEach((doc, i) => {
      const threshold = thresholds[i] || { store: 10, dispensary: 10, type: "" }
      storeRows.push({
        product: doc._id,
        quantity: doc.quantity,
        initialStoreQty: doc.quantity,
        threshold: threshold.store,
        status: doc.quantity === 0 ? "Sold Out" : doc.quantity <= threshold.store ? "Low Stock" : "In Stock",
        isDeleted: false,
        isActive: true,
      })
      dispensaryRows.push({
        product: doc._id,
        quantity: 0,
        initialDispensaryQty: 0,
        threshold: threshold.dispensary,
        status: "Sold Out",
        isDeleted: false,
        isActive: true,
      })
    })

    await Promise.all([
      Store.insertMany(storeRows, { ordered: false }),
      Dispensary.insertMany(dispensaryRows, { ordered: false }),
    ])

    // One aggregation pass over the batch instead of a per-document hook.
    await syncExpiryNotifications(inserted)

    return res.status(201).json({
      message: `Imported ${inserted.length} product${inserted.length === 1 ? "" : "s"}`,
      imported: inserted.length,
      skipped: errors.length,
      errors,
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export async function UpdateStoreQuantity(req, res) {
  try {
    const productId = req.params.id;
    const userId = req.user._id;
    let { quantity, ...otherUpdates } = req.body;
    quantity = Number(quantity); // Ensure it's a number
 if (otherUpdates.distributor) {
      if (!otherUpdates.distributor.name) {
        otherUpdates.distributor.name = "Unknown";
      }
      if (!otherUpdates.distributor.contact) {
        otherUpdates.distributor.contact = "0000000000";
      }
    }

    // if (!otherUpdates.unitPrice && otherUpdates.sellingPrice && otherUpdates.markup) {
    //   const markupPercentage = otherUpdates.markup / 100;
    //   otherUpdates.unitPrice = otherUpdates.sellingPrice / (1 + markupPercentage);
    // }
    

    if (!otherUpdates.brand && otherUpdates.type === "medicine") {
      otherUpdates.brand = "no_brand";
    }
    const store = await Store.findOne({ product: productId });
    const dispensary = await Dispensary.findOne({ product: productId });
    const product = await Product.findById(productId);

    if (!store) return res.status(404).json({ message: "Store record not found" });
    if (!product) return res.status(404).json({ message: "Product not found" });
    otherUpdates = calculateInterdependentPrices(product, otherUpdates);
    // Get old quantity before update
    const oldQuantity = store.quantity;
    const quantityChange = quantity - oldQuantity;

    // Update store quantity
    store.quantity = quantity;
    await store.save();

    // Create transfer record for store quantity change
    if (quantityChange !== 0) {
      const updateType = quantityChange > 0 ? "QUANTITY_ADDED" : "QUANTITY_DEDUCTED";
      const transfer = new Transfare({
        product: productId,
        user: userId,
        type: "UPDATED_IN_STORE",
        UpdateType: updateType,
        quantity: Math.abs(quantityChange),
        quantityLeft: quantity,
        totalQuantity: quantity + (dispensary ? dispensary.quantity : 0),
        unitPrice: product.unitPrice,
        totalUnitPrice: product.unitPrice * Math.abs(quantityChange),
      });
      await transfer.save();
    }

    // Update product total quantity and other fields
    const dispensaryQty = dispensary ? Number(dispensary.quantity) : 0;
    otherUpdates.quantity = quantity + dispensaryQty;
    const updatedProduct = await Product.findByIdAndUpdate(productId, otherUpdates, { new: true, runValidators: true });

    await Store.updateStatus(productId);
    await Dispensary.updateStatus(productId);

    syncExpiryNotificationsInBackground([updatedProduct]);

    const productWithInventory = await populateProductWithInventory(updatedProduct);

    return res.status(200).json({
      message: "Store quantity and product details updated successfully",
      product: productWithInventory,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function UpdateDispensaryQuantity(req, res) {
  try {
    const productId = req.params.id;
    const userId = req.user._id;
    let { quantity, ...otherUpdates } = req.body;
    quantity = Number(quantity); // Ensure it's a number
 if (otherUpdates.distributor) {
      if (!otherUpdates.distributor.name) {
        otherUpdates.distributor.name = "Unknown";
      }
      if (!otherUpdates.distributor.contact) {
        otherUpdates.distributor.contact = "0000000000";
      }
    }

    // if (!otherUpdates.unitPrice && otherUpdates.sellingPrice && otherUpdates.markup) {
    //   const markupPercentage = otherUpdates.markup / 100;
    //   otherUpdates.unitPrice = otherUpdates.sellingPrice / (1 + markupPercentage);
    // }

    if (!otherUpdates.brand && otherUpdates.type === "medicine") {
      otherUpdates.brand = "no_brand";
    }
    const dispensary = await Dispensary.findOne({ product: productId });
    const store = await Store.findOne({ product: productId });
    const product = await Product.findById(productId);

    if (!dispensary) return res.status(404).json({ message: "Dispensary record not found" });
    if (!product) return res.status(404).json({ message: "Product not found" });
    otherUpdates = calculateInterdependentPrices(product, otherUpdates);
    // Get old quantity before update
    const oldQuantity = dispensary.quantity;
    const quantityChange = quantity - oldQuantity;

    // Update dispensary quantity
    dispensary.quantity = quantity;
    await dispensary.save();

    // Create transfer record for dispensary quantity change
    if (quantityChange !== 0) {
      const updateType = quantityChange > 0 ? "QUANTITY_ADDED" : "QUANTITY_DEDUCTED";
      const transfer = new Transfare({
        product: productId,
        user: userId,
        type: "UPDATED_IN_DISPENSARY",
        UpdateType: updateType,
        quantity: Math.abs(quantityChange),
        quantityLeft: quantity,
        totalQuantity: quantity + (store ? store.quantity : 0),
        unitPrice: product.unitPrice,
        totalUnitPrice: product.unitPrice * Math.abs(quantityChange),
      });
      await transfer.save();
    }

    // Update product total quantity and other fields
    const storeQty = store ? Number(store.quantity) : 0;
    otherUpdates.quantity = storeQty + quantity;
    const updatedProduct = await Product.findByIdAndUpdate(productId, otherUpdates, { new: true, runValidators: true });

    await Store.updateStatus(productId);
    await Dispensary.updateStatus(productId);

    syncExpiryNotificationsInBackground([updatedProduct]);

    const productWithInventory = await populateProductWithInventory(updatedProduct);

    return res.status(200).json({
      message: "Dispensary quantity and product details updated successfully",
      product: productWithInventory,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
