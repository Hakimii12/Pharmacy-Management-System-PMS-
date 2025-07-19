import Product from "../models/ProductModel.js"
import Store from "../models/StoreModel.js"
import Dispensary from "../models/DispensaryModel.js"
import Transfare from "../models/Transfer.js"
import Sales from "../models/SalesModel.js"
// Helper function to get inventory data
async function getInventoryData(productId) {
  const store = await Store.findOne({ product: productId, isDeleted: { $ne: true } })
  const dispensary = await Dispensary.findOne({ product: productId, isDeleted: { $ne: true } })

  return {
    store: store && store.isActive ? store.quantity : 0,
    dispensary: dispensary && dispensary.isActive ? dispensary.quantity : 0,
    storeThreshold: store ? store.threshold : 10,
    dispensaryThreshold: dispensary ? dispensary.threshold : 10,
    storeActive: store ? store.isActive : false,
    dispensaryActive: dispensary ? dispensary.isActive : false,
    storeExists: !!store,
    dispensaryExists: !!dispensary,
  }
}

// Helper function to populate product with inventory
async function populateProductWithInventory(product) {
  if (!product) return null

  const inventory = await getInventoryData(product._id)
  return {
    ...product.toObject(),
    inventory,
  }
}

export async function CreateProduct(req, res) {
  try {
    const userId = req.user._id
    const { name, unitPrice, quantity, batchNo, expiryDate, markup, DosageForms, category, distributor, brand } =
      req.body

    const productBrand = brand || "-"
    const productDosageForms = DosageForms || "-"

    if (!distributor || !distributor.name || !distributor.contact) {
      return res.status(400).json({
        message: "Distributor information must include name and contact",
      })
    }

    const newProduct = new Product({
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
    })

    await newProduct.save()

    // Create store and dispensary records
    await Store.create({
      product: newProduct._id,
      quantity: quantity,
      threshold: 10,
      isDeleted: false,
      isActive: true,
    })

    await Dispensary.create({
      product: newProduct._id,
      quantity: 0,
      threshold: 10,
      isDeleted: false,
      isActive: true,
    })

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

    return res.status(200).json({
      message: "Product permanently deleted successfully",
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}
export async function UpdateProduct(req, res) {
  try {
    const productId = req.params.id
    const userId = req.user._id
    const updates = { ...req.body }

    const existingProduct = await Product.findById(productId)
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" })
    }

    if (existingProduct.addedBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: "only person Lounched can update this product" })
    }

    if (updates.distributor) {
      if (!updates.distributor.name || !updates.distributor.contact) {
        return res.status(400).json({
          message: "Distributor must include name and contact",
        })
      }
    }

    // Handle quantity changes
    if (updates.quantity !== undefined) {
      const dispensary = await Dispensary.findOne({ product: productId })
      const currentDispensary = dispensary ? dispensary.quantity : 0
      const newQuantity = updates.quantity

      if (newQuantity < currentDispensary) {
        return res.status(400).json({
          message: `Quantity cannot be less than dispensary stock (${currentDispensary})`,
        })
      }

      // Update store quantity
      await Store.findOneAndUpdate(
        { product: productId },
        { quantity: newQuantity - currentDispensary },
        { upsert: true },
      )
    }

    // Recalculate prices if relevant fields change
    const unitPrice = updates.unitPrice !== undefined ? updates.unitPrice : existingProduct.unitPrice
    const quantity = updates.quantity !== undefined ? updates.quantity : existingProduct.quantity
    const markup = updates.markup !== undefined ? updates.markup : existingProduct.markup

    if (updates.unitPrice !== undefined || updates.quantity !== undefined || updates.markup !== undefined) {
      updates.totalPrice = unitPrice * quantity
      updates.sellingPrice = unitPrice * (1 + markup / 100)
      updates.totalSellingPrice = updates.sellingPrice * quantity
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $set: updates },
      { new: true, runValidators: true },
    )

    const productWithInventory = await populateProductWithInventory(updatedProduct)

    return res.status(200).json({
      message: "Product updated successfully",
      product: productWithInventory,
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
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

    // Soft delete from dispensary
    await Dispensary.findOneAndUpdate(
      { product: productId },
      {
        isDeleted: true,
        isActive: false,
        deletedAt: new Date(),
        deletedBy: userId,
        quantity: 0, // Set quantity to 0 when deleted
      },
    )

    // Check if product should be completely deleted (if both locations are deleted)
    const store = await Store.findOne({ product: productId, isDeleted: { $ne: true } })

    if (!store || store.isDeleted) {
      // Both locations are deleted, soft delete the main product
      await Product.findByIdAndUpdate(productId, {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
        visibility: "deleted",
      })
    }

    // Clean up dispensary-related notifications
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
    await Store.findOneAndUpdate({ product: productId }, { $inc: { quantity: -quantity } })

    await Dispensary.findOneAndUpdate({ product: productId }, { $inc: { quantity: quantity } })

    // Create transfer record
    const transfare = new Transfare({
      product: productId,
      user: userId,
      type: "ISSUE_TO_DISPENSARY",
      quantity: quantity,
      quantityLeft: store.quantity - quantity,
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
    await Dispensary.findOneAndUpdate({ product: productId }, { $inc: { quantity: -quantity } })

    await Store.findOneAndUpdate({ product: productId }, { $inc: { quantity: quantity } }, { upsert: true })

    // Create transfer record
    const transfare = new Transfare({
      product: productId,
      user: userId,
      type: "RETURN_TO_STORE",
      quantity: quantity,
      quantityLeft: dispensary.quantity - quantity,
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

export async function GetIssuedDispensary(req, res) {
  try {
    const history = await Transfare.find({ type: "ISSUE_TO_DISPENSARY" })
      .populate("user", "name email role")
      .populate("product", "name brand batchNo expiryDate unitPrice sellingPrice category ")
      .sort({ date: -1 })

    return res.json({ history })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export async function GetReturnToStore(req, res) {
  try {
    const history = await Transfare.find({ type: "RETURN_TO_STORE" })
      .populate("user", "name email role")
      .populate("product", "name brand batchNo expiryDate unitPrice sellingPrice category")
      .sort({ date: -1 })

    return res.json({ history })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export async function GetAllProducts(req, res) {
  try {
    const products = await Product.find({ visibility: "enable", isDeleted: { $ne: true } })
    const productsWithInventory = await Promise.all(products.map((product) => populateProductWithInventory(product)))

    // Filter out any null products
    const validProducts = productsWithInventory.filter((p) => p !== null)

    return res.json({ products: validProducts })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export async function GetStoreProduct(req, res) {
  try {
    const storeProducts = await Store.find({ quantity: { $gt: 0 } }).populate("product")
    const products = storeProducts.map((store) => store.product).filter(Boolean)
    const productsWithInventory = await Promise.all(products.map((product) => populateProductWithInventory(product)))
    return res.json({ products: productsWithInventory })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export async function GetDispensaryProduct(req, res) {
  try {
    const dispensaryProducts = await Dispensary.find({ quantity: { $gt: 0 } }).populate("product")
    const products = dispensaryProducts.map((dispensary) => dispensary.product).filter(Boolean)
    const productsWithInventory = await Promise.all(products.map((product) => populateProductWithInventory(product)))
    return res.json({ products: productsWithInventory })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export async function GetCountedStore(req, res) {
  try {
    const results = await Store.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      {
        $unwind: "$productInfo",
      },
      {
        $match: {
          quantity: { $gt: 0 },
          isDeleted: false, // Only non-deleted store records
          isActive: true, // Only active store records
          "productInfo.isDeleted": { $ne: true }, // Only non-deleted products
        },
      },
      {
        $addFields: {
          inventoryValue: { $multiply: ["$productInfo.unitPrice", "$quantity"] },
          sellingValue: { $multiply: ["$productInfo.sellingPrice", "$quantity"] },
          isLowStore: {
            $and: [
              { $lt: ["$quantity", "$threshold"] },
              { $gt: ["$quantity", 0] },
              { $gt: ["$productInfo.expiryDate", new Date()] },
            ],
          },
          isExpired: {
            $and: [{ $lte: ["$productInfo.expiryDate", new Date()] }, { $gt: ["$quantity", 0] }],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalInStore: { $sum: 1 },
          lowInStore: { $sum: { $cond: ["$isLowStore", 1, 0] } },
          expiredInStore: { $sum: { $cond: ["$isExpired", 1, 0] } },
          totalInventoryValue: { $sum: "$inventoryValue" },
          totalSellingValue: { $sum: "$sellingValue" },
          potentialProfit: {
            $sum: {
              $subtract: ["$sellingValue", "$inventoryValue"],
            },
          },
        },
      },
    ])

    // Also update the out of stock count to include the same filters
    const outOfStockCount = await Store.countDocuments({
      quantity: 0,
      isDeleted: false,
      isActive: true,
    })

    const result = results[0] || {
      totalInStore: 0,
      lowInStore: 0,
      expiredInStore: 0,
      totalInventoryValue: 0,
      totalSellingValue: 0,
      potentialProfit: 0,
    }

    result.outOfStockInStore = outOfStockCount

    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export async function GetCountedDispensary(req, res) {
  try {
    const results = await Dispensary.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      {
        $unwind: "$productInfo",
      },
      {
        $match: {
          quantity: { $gt: 0 },
          isDeleted: false, // Only non-deleted dispensary records
          isActive: true, // Only active dispensary records
          "productInfo.isDeleted": { $ne: true }, // Only non-deleted products
        },
      },
      {
        $addFields: {
          inventoryValue: { $multiply: ["$productInfo.unitPrice", "$quantity"] },
          sellingValue: { $multiply: ["$productInfo.sellingPrice", "$quantity"] },
          isLowDispensary: {
            $and: [
              { $lt: ["$quantity", "$threshold"] },
              { $gt: ["$quantity", 0] },
              { $gt: ["$productInfo.expiryDate", new Date()] },
            ],
          },
          isExpired: {
            $and: [{ $lte: ["$productInfo.expiryDate", new Date()] }, { $gt: ["$quantity", 0] }],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalInDispensary: { $sum: 1 },
          lowInDispensary: { $sum: { $cond: ["$isLowDispensary", 1, 0] } },
          expiredInDispensary: { $sum: { $cond: ["$isExpired", 1, 0] } },
          totalInventoryValue: { $sum: "$inventoryValue" },
          totalSellingValue: { $sum: "$sellingValue" },
          potentialProfit: {
            $sum: {
              $subtract: ["$sellingValue", "$inventoryValue"],
            },
          },
        },
      },
    ])

    // Also update the out of stock count to include the same filters
    const outOfStockCount = await Dispensary.countDocuments({
      quantity: 0,
      isDeleted: false,
      isActive: true,
    })

    const result = results[0] || {
      totalInDispensary: 0,
      lowInDispensary: 0,
      expiredInDispensary: 0,
      totalInventoryValue: 0,
      totalSellingValue: 0,
      potentialProfit: 0,
    }

    result.outOfStockInDispensary = outOfStockCount

    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
