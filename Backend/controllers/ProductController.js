import Product from "../models/ProductModel.js"
import Store from "../models/StoreModel.js"
import Dispensary from "../models/DispensaryModel.js"
import Transfare from "../models/Transfer.js"

// Helper function to get inventory data
async function getInventoryData(productId) {
  const store = await Store.findOne({ product: productId })
  const dispensary = await Dispensary.findOne({ product: productId })

  return {
    store: store ? store.quantity : 0,
    dispensary: dispensary ? dispensary.quantity : 0,
    storeThreshold: store ? store.threshold : 10,
    dispensaryThreshold: dispensary ? dispensary.threshold : 10,
  }
}

// Helper function to populate product with inventory
async function populateProductWithInventory(product) {
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
    })

    await newProduct.save()

    // Create store and dispensary records
    await Store.create({
      product: newProduct._id,
      quantity: quantity,
      threshold: 10,
    })

    await Dispensary.create({
      product: newProduct._id,
      quantity: 0,
      threshold: 10,
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

export async function IssueToDispensary(req, res) {
  try {
    const userId = req.user._id
    const { productId, quantity } = req.body

    const product = await Product.findById(productId)
    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    const store = await Store.findOne({ product: productId })
    if (!store || store.quantity < quantity) {
      return res.status(400).json({
        message: `Insufficient stock in store. Available: ${store ? store.quantity : 0}`,
      })
    }

    // Update quantities
    await Store.findOneAndUpdate({ product: productId }, { $inc: { quantity: -quantity } })

    await Dispensary.findOneAndUpdate({ product: productId }, { $inc: { quantity: quantity } }, { upsert: true })

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
    const products = await Product.find({ visibility: "enable" })
    const productsWithInventory = await Promise.all(products.map((product) => populateProductWithInventory(product)))
    return res.json({ products: productsWithInventory })
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

    const outOfStockCount = await Store.countDocuments({ quantity: 0 })

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

    const outOfStockCount = await Dispensary.countDocuments({ quantity: 0 })

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

export async function RemoveFromTheShelf(req, res) {
  const productId = req.params.id

  try {
    const prod = await Product.findById(productId)
    console.log(prod)
    const product = await Product.findByIdAndUpdate(productId, { visibility: "disable" }, { new: true })
    const productWithInventory = await populateProductWithInventory(product)
    return res.status(200).json(productWithInventory)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: error.message })
  }
}
