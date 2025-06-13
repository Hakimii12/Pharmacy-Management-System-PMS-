import Product from "../models/DrugModel.js";
import Profit from "../models/ProfitModel.js";
import Sales from "../models/SalesModel.js";
export async function CreateProduct(req,res){
    try {
    const { name, brand, unitPrice, quantity, batchNo, expiryDate, markup,DosageForms,ProductType} = req.body;
        const newProduct = new Product({
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
