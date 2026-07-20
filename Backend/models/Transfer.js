import mongoose from "mongoose";
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

// Index for filtering by product and type (used heavily in InventoryController)
TransfareSchema.index({ product: 1, type: 1 });
// Index for sorted history queries per product
TransfareSchema.index({ product: 1, date: -1 });

const Transfare= mongoose.model('Transfare', TransfareSchema)
export default Transfare;