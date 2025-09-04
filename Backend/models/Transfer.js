import mongoose from "mongoose";
import User from "./UserModel.js";
import Product from "./ProductModel.js";
const TransfareSchema = new mongoose.Schema({
   product :{
         type:mongoose.Schema.Types.ObjectId,
         ref:'Product',
         required:true,
   },
   user:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'User',
    required:true
   },
   type:{
    type:String,
    enum: ['ISSUE_TO_DISPENSARY', 'RETURN_TO_STORE',"UPDATED_IN_STORE","UPDATED_IN_DISPENSARY","RETURN_REFUND"],
    required:true
   },
   UpdateType:{
    type:String,
    enum: ['QUANTITY_ADDED', 'QUANTITY_DEDUCTED']
   },
   quantity:{
    type:Number,
    required:true
   },
   quantityLeft:Number,
   totalQuantity:Number,
   issuedPrice:Number,
   unitPrice:Number,
   totalIssuedPrice:Number,
   totalUnitPrice:Number,
    date: {
    type: Date,
    default: Date.now
  }
});
const Transfare= mongoose.model('Transfare', TransfareSchema)
export default Transfare;