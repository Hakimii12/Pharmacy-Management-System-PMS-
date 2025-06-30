import Product from "../models/productModel.js";
import Profit from "../models/ProfitModel.js";
import Sales from "../models/SalesModel.js";
import { updateProfitSummary} from "../utils/profitUtils.js";
export async function CreateProduct(req,res){
    try {
        const userId=req.user._id
    const { name, brand, unitPrice, quantity, batchNo, expiryDate, markup,DosageForms,ProductType} = req.body;
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
            DosageForms,
            ProductType
        });

        await newProduct.save();
        return res.status(201).json({ message: "New product added successfully", Product: newProduct });
        
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}
export async function GetAllProducts(req,res){
    try {
        const products = await Product.find();
        return res.status(200).json({ message: "Products retrieved successfully", Products: products });
    } catch (error) {
        return res.status(500).json({message: error.message})
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
  "name brand unitPrice sellingPrice productType dosageForms quantity"
);

// Update profit summary (daily/monthly/yearly)
await updateProfitSummary(profit, sale.timestamp);
res.status(200).json(sale);

}