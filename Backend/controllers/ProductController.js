import Product from "../models/ProductModel.js";
import Profit from "../models/ProfitModel.js";
import Sales from "../models/SalesModel.js";
import Transfare from "../models/Transfer.js";
import User from "../models/UserModel.js";
import { updateProfitSummary} from "../utils/profitUtils.js";
export async function CreateProduct(req,res){
    try {
        const userId=req.user._id
    const { name, brand, unitPrice, quantity, batchNo, expiryDate, markup,DosageForms,category,distributor} = req.body;
    console.log(name, brand, unitPrice, quantity, batchNo, expiryDate, markup,DosageForms,category,distributor)
    console.log(distributor,distributor.name ,distributor.contact)
    if (!distributor || !distributor.name || !distributor.contact) {
      return res.status(400).json({
        message: "Distributor information must include name and contact"
      });
    }
        const newProduct = new Product({
            addedBy:userId,
            name,
            brand,
            unitPrice,
            quantity,
            totalPrice: unitPrice * quantity,
            batchNo,
            expiryDate,
            markup,
            sellingPrice: unitPrice * (1 + markup/100),
            totalSellingPrice: (unitPrice * (1 + markup/100))* quantity,
            inventory: {
            store: quantity,
            dispensary: 0
            },
            DosageForms,
            category,
            distributor,
        });
        
        await newProduct.save();
        return res.status(201).json({ message: "New product added successfully", Product: newProduct });
        
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}
export async function IssueToDispensary(req, res) {
  try {
    const userId = req.user._id;
    const { productId, quantity } = req.body;
    console.log({ productId, quantity, type: typeof quantity });
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.inventory.store < quantity) {
      return res.status(400).json({ 
        message: `Insufficient stock in store. Available: ${product.inventory.store}`
      });
    }

    // Update quantities
    product.inventory.store -= quantity;
    product.inventory.dispensary += quantity;

    // Create transfare record
    const transfare = new Transfare({
      product: productId,
      user: userId,
      type: 'ISSUE_TO_DISPENSARY',
      quantity: quantity,
      quantityLeft: product.inventory.store,
      totalQuantity: product.quantity,
      issuedPrice:product.sellingPrice,
      unitPrice:product.unitPrice,
      totalIssuedPrice:product.sellingPrice * quantity,
      totalUnitPrice:product.unitPrice * quantity
    });

    await Promise.all([product.save(), transfare.save()]);

    return res.json({ 
      message: "Product issued to dispensary successfully",
      updatedInventory: {
        store: product.inventory.store,
        dispensary: product.inventory.dispensary
      },
      transfareId: transfare._id
    });
    
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
export async function ReturnToStore(req, res) {
  try {
    const userId = req.user._id;
    const { productId, quantity } = req.body;
    
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.inventory.dispensary < quantity) {
      return res.status(400).json({ 
        message: `Insufficient stock in dispensary. Available: ${product.inventory.dispensary}`
      });
    }

    // Update quantities
    product.inventory.dispensary -= quantity;
    product.inventory.store += quantity;

    // Create transfare record
    const transfare = new Transfare({
      product: productId,
      user: userId,
      type: 'RETURN_TO_STORE',
      quantity: quantity,
      quantityLeft: product.inventory.dispensary,
      totalQuantity: product.quantity,
      issuedPrice: product.sellingPrice,
      unitPrice: product.unitPrice,
      totalIssuedPrice: product.sellingPrice * quantity,
      totalUnitPrice: product.unitPrice * quantity
    });

    await Promise.all([product.save(), transfare.save()]);

    return res.json({ 
      message: "Product returned to store successfully",
      updatedInventory: {
        store: product.inventory.store,
        dispensary: product.inventory.dispensary
      },
      transfareId: transfare._id
    });
    
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
export async function GetIssuedDispensary(req, res) {
  try {
    const history = await Transfare.find({type: "ISSUE_TO_DISPENSARY"})
      .populate('user', 'name email role')
      .populate('product','name brand batchNo expiryDate unitPrice sellingPrice category ')
      .sort({ date: -1 });
    return res.json({ history });
    
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
export async function RecordSale(req, res){
  const { productId, quantitySold } = req.body;
  const product = await Product.findById(productId);
  if (!product || product.quantity < quantitySold) {
    return res.status(400).json({ error: "Insufficient stock" });
  }
  // Calculate profit
  const costPrice = product.unitPrice;
  const sellingPrice = costPrice * (1 + product.markup / 100);
  const profit = (sellingPrice - costPrice) * quantitySold;

  // Update product stock
  product.quantity -= quantitySold;
  product.totalPrice = product.unitPrice * product.quantity;
  await product.save();

  // Record sale
  const createdSale = await Sales.create({
  product: productId,
  quantitySold,
  profit,
  timestamp: new Date()
});

// Populate the sale with product details
const sale = await Sales.findById(createdSale._id).populate(
  "product",
  "name brand unitPrice sellingPrice category dosageForms quantity"
);

// Update profit summary (daily/monthly/yearly)
await updateProfitSummary(profit, sale.timestamp);
res.status(200).json(sale);

}
export async function GetAllProducts(req,res){
    try {
        const products = await Product.find();
        return res.json({ products });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}
export async function GetStoreProduct(req,res){
  try {
    const products = await Product.find({"inventory.store":{$gt:0}});
    return res.json({ products });
  } catch (error) {
    return res.status(500).json({message:error.message})
  }
}
export async function GetDispensaryProduct(req,res){
  try {
    const products = await Product.find({"inventory.dispensary":{$gt:0}});
    return res.json({ products });
  } catch (error) {
    return res.status(500).json({message:error.message})
  }
}
export async function GetCountedStore(req, res) {
  try {
    const results = await Product.aggregate([
      {
        $facet: {
          inStoreProducts: [
            { $match: { "inventory.store": { $gt: 0 } } },
            {
              $addFields: {
                inventoryValue: { $multiply: ["$unitPrice", "$inventory.store"] },
                sellingValue: { $multiply: ["$sellingPrice", "$inventory.store"] },
                isLowStore: {
                  $and: [
                    { $lt: ["$inventory.store", "$inventory.storeThreshold"] },
                    { $gt: ["$inventory.store", 0] },
                    { $gt: ["$expiryDate", new Date()] }
                  ]
                },
                isExpired:{$and:[
                  { $lte: ["$expiryDate", new Date()] },
                  { $gt: ["$inventory.store", 0] }
                ]} 
              }
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
                    $subtract: ["$sellingValue", "$inventoryValue"]
                  }
                }
              }
            }
          ],
          outOfStockProducts: [
            { $match: { "inventory.store": 0 } },
            { $count: "count" },
          ]
        }
      },
      {
        $project: {
          summary: {
            $mergeObjects: [
              { $ifNull: [{ $arrayElemAt: ["$inStoreProducts", 0] }, {}] },
              {
                outOfStockInStore: {
                  $ifNull: [{ $arrayElemAt: ["$outOfStockProducts.count", 0] }, 0]
                }
              }
            ]
          }
        }
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              {
                totalInStore: 0,
                lowInStore: 0,
                expiredInStore: 0,
                totalInventoryValue: 0,
                totalSellingValue: 0,
                potentialProfit: 0,
                outOfStockInStore: 0
              },
              "$summary"
            ]
          }
        }
      }
    ]);

    res.json(results[0] || {
      totalInStore: 0,
      lowInStore: 0,
      expiredInStore: 0,
      totalInventoryValue: 0,
      totalSellingValue: 0,
      potentialProfit: 0,
      outOfStockInStore: 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}