import mongoose from "mongoose";
const ProductSchema = new mongoose.Schema({
     name: {type:String , required:true,index:true},
     brand: {type:String,required:true, index:true},
     unitPrice:{type:Number , required:true},
     quantity:{type:Number , required:true},
     totalPrice:{type:Number,required:true},
     batchNo:{type:String,required:true,unique:true},
     expiryDate:{type:Date,required:true},
     markup:{type:Number,required:true},
     sellingPrice:{type:Number,required:true},
     totalSellingPrice:{type:Number,required:true},
     isExpired:{type:Boolean,default:false},
     DosageForms:{ type:String,enum:["tablet","syrup","injection","ointment"]},
     ProductType:{ type:String,enum:["medicine","cosmetic"]},
     createdAt: { type: Date, default: Date.now },
     updatedAt: { type: Date, default: Date.now }
});
const Product = mongoose.model("Product", ProductSchema);
export default Product;
