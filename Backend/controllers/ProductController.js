import Product from "../models/ProductModel.js"
import Dispensary from "../models/DispensaryModel.js"
import Store from "../models/StoreModel.js"
import Transfare from "../models/Transfer.js"
import Sales from "../models/SalesModel.js"
import Notification from "../models/NotificationModel.js"

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
    // New fields for status and expiry per location
    storeStatus: store ? store.status : "Sold Out",
    dispensaryStatus: dispensary ? dispensary.status : "Sold Out",
    storeIsExpired: store ? store.isExpired : false,
    dispensaryIsExpired: dispensary ? dispensary.isExpired : false,
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
 export async function CreateProductInDispensary(req, res) {
  try {
    const userId = req.user._id
    const {
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
      type,
      unit, // <-- add unit here
    } = req.body
    const productBrand = brand || ""
    const productDosageForms = DosageForms || ""
    const productType = type || ""
    const storeThresholdValue = storeThreshold !== undefined ? storeThreshold : 10
    const dispensaryThresholdValue = dispensaryThreshold !== undefined ? dispensaryThreshold : 10

    if (!distributor || !distributor.name || !distributor.contact) {
      return res.status(400).json({
        message: "Distributor information must include name and contact",
      })
    }

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
    if (unit) newProductData.unit = unit // <-- add unit if provided

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
    const {
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
      type,
      unit, // <-- add unit here
    } = req.body
    const productBrand = brand || ""
    const productDosageForms = DosageForms || ""
    const productType = type || ""
    const storeThresholdValue = storeThreshold !== undefined ? storeThreshold : 10
    const dispensaryThresholdValue = dispensaryThreshold !== undefined ? dispensaryThreshold : 10

    if (!distributor || !distributor.name || !distributor.contact) {
      return res.status(400).json({
        message: "Distributor information must include name and contact",
      })
    }

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
    if (unit) newProductData.unit = unit // <-- add unit if provided

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
    const updates = { ...req.body };

    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
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
    // Filter out any null products (e.g., if product was hard deleted but inventory records still exist temporarily)
    const validProducts = productsWithInventory.filter((p) => p !== null)
    return res.json({ products: validProducts })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export async function GetStoreProduct(req, res) {
  try {
    const storeProducts = await Store.find({ quantity: { $gte: 0 }, isDeleted: { $ne: true }, isActive: true }).populate(
      "product",
    )
    const products = storeProducts.map((store) => store.product).filter(Boolean)
    const productsWithInventory = await Promise.all(products.map((product) => populateProductWithInventory(product)))
    return res.json({ products: productsWithInventory })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export async function GetDispensaryProduct(req, res) {
  try {
    const dispensaryProducts = await Dispensary.find({
      quantity: { $gt: 0 },
      isDeleted: { $ne: true },
      isActive: true,
    }).populate("product")
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

export async function CountAllProduct(req, res) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const stats = await Product.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          visibility: "enable",
        },
      },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
          totalValue: { $sum: "$totalPrice" },
          totalSellingValue: { $sum: { $multiply: ["$sellingPrice", "$quantity"] } },
          byCategory: {
            $push: {
              category: "$category",
              count: 1,
            },
          },
          nearExpiry: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ["$expiryDate", today] },
                    { $lte: ["$expiryDate", new Date(new Date().setMonth(new Date().getMonth() + 3))] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          expiredCount: {
            $sum: {
              $cond: [{ $lte: ["$expiryDate", today] }, 1, 0],
            },
          },
        },
      },
      {
        $unwind: "$byCategory",
      },
      {
        $group: {
          _id: "$byCategory.category",
          totalProducts: { $first: "$totalProducts" },
          totalQuantity: { $first: "$totalQuantity" },
          totalValue: { $first: "$totalValue" },
          totalSellingValue: { $first: "$totalSellingValue" },
          nearExpiry: { $first: "$nearExpiry" },
          expiredCount: { $first: "$expiredCount" },
          categoryCount: { $sum: "$byCategory.count" },
        },
      },
      {
        $group: {
          _id: null,
          totalProducts: { $first: "$totalProducts" },
          totalQuantity: { $first: "$totalQuantity" },
          totalValue: { $first: "$totalValue" },
          totalSellingValue: { $first: "$totalSellingValue" },
          nearExpiry: { $first: "$nearExpiry" },
          expiredCount: { $first: "$expiredCount" },
          byCategory: {
            $push: {
              category: "$_id",
              count: "$categoryCount",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalProducts: 1,
          totalQuantity: 1,
          totalValue: 1,
          totalSellingValue: 1,
          potentialProfit: {
            $subtract: ["$totalSellingValue", "$totalValue"],
          },
          nearExpiry: 1,
          expiredCount: 1,
          byCategory: 1,
        },
      },
    ])

    const result = stats[0] || {
      totalProducts: 0,
      totalQuantity: 0,
      totalValue: 0,
      totalSellingValue: 0,
      potentialProfit: 0,
      nearExpiry: 0,
      expiredCount: 0,
      byCategory: [],
    }
    return res.json(result)
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

    const store = await Store.findOne({ product: productId });
    const dispensary = await Dispensary.findOne({ product: productId });
    const product = await Product.findById(productId);

    if (!store) return res.status(404).json({ message: "Store record not found" });
    if (!product) return res.status(404).json({ message: "Product not found" });

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

    const dispensary = await Dispensary.findOne({ product: productId });
    const store = await Store.findOne({ product: productId });
    const product = await Product.findById(productId);

    if (!dispensary) return res.status(404).json({ message: "Dispensary record not found" });
    if (!product) return res.status(404).json({ message: "Product not found" });

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

    const productWithInventory = await populateProductWithInventory(updatedProduct);

    return res.status(200).json({
      message: "Dispensary quantity and product details updated successfully",
      product: productWithInventory,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
