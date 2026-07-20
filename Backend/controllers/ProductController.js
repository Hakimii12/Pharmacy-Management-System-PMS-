import Product from "../models/ProductModel.js"
import Dispensary from "../models/DispensaryModel.js"
import Store from "../models/StoreModel.js"
import Transfare from "../models/Transfer.js"
import Sales from "../models/SalesModel.js"
import Notification from "../models/NotificationModel.js"
import {calculateInterdependentPrices} from "../helper/calculateInterdependentPrices.js"

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
 * BULK helper — replaces the N+1 pattern for list endpoints.
 * Uses a single aggregation pipeline with $lookup to join Store and Dispensary
 * data for ALL matching products in ONE database round-trip.
 *
 * @param {object} matchStage - MongoDB match filter for the Product collection
 * @returns {Array} products with embedded inventory object
 */
async function getProductsWithInventory(matchStage) {
  return Product.aggregate([
    { $match: matchStage },
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
    {
      $project: {
        storeData: 0,
        dispensaryData: 0,
        _store: 0,
        _dispensary: 0,
      },
    },
  ])
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
    if (updates.distributor) {
      if (!updates.distributor.name) {
        updates.distributor.name = "Unknown";
      }
      if (!updates.distributor.contact) {
        updates.distributor.contact = "0000000000";
      }
    }
   
    // if (!updates.unitPrice && updates.sellingPrice && updates.markup) {
    //   const markupPercentage = updates.markup / 100;
    //   updates.unitPrice = updates.sellingPrice / (1 + markupPercentage);
    // }
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
      .populate("product", "name brand batchNo expiryDate unitPrice sellingPrice category")
      .sort({ date: -1 })
      .lean()
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
      .lean()
    return res.json({ history })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export async function GetAllProducts(req, res) {
  try {
    // Single aggregation query — replaces 1 + 2N separate DB queries
    const products = await getProductsWithInventory({
      visibility: "enable",
      isDeleted: { $ne: true },
    })
    return res.json({ products })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export async function GetStoreProduct(req, res) {
  try {
    // Get product IDs active in store, then fetch with inventory in one query
    const storeRecords = await Store.find(
      { quantity: { $gte: 0 }, isDeleted: { $ne: true }, isActive: true },
      { product: 1 }
    ).lean()
    const productIds = storeRecords.map((s) => s.product)
    const products = await getProductsWithInventory({ _id: { $in: productIds } })
    return res.json({ products })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export async function GetDispensaryProduct(req, res) {
  try {
    const dispensaryRecords = await Dispensary.find(
      { quantity: { $gte: 0 }, isDeleted: { $ne: true }, isActive: true },
      { product: 1 }
    ).lean()
    const productIds = dispensaryRecords.map((d) => d.product)
    const products = await getProductsWithInventory({ _id: { $in: productIds } })
    return res.json({ products })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export async function GetDispensaryProductToSell(req, res) {
  try {
    const dispensaryRecords = await Dispensary.find(
      { quantity: { $gt: 0 }, isDeleted: { $ne: true }, isActive: true },
      { product: 1 }
    ).lean()
    const productIds = dispensaryRecords.map((d) => d.product)
    const products = await getProductsWithInventory({ _id: { $in: productIds } })
    return res.json({ products })
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

    const productWithInventory = await populateProductWithInventory(updatedProduct);

    return res.status(200).json({
      message: "Dispensary quantity and product details updated successfully",
      product: productWithInventory,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
