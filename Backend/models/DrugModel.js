import mongoose from "mongoose";
const drugSchema = new mongoose.Schema({
     name: {type:String , required:true,index:true},
     brand: {type:String,required:true, index:true},
     unitPrice:{type:Number , required:true},
     quantity:{type:Number , required:true},
     totalPrice:{type:Number,required:true},
     batchNo:{type:String,required:true,unique:true},
     expiryDate:{type:Date,required:true},
     markup:{type:Number,required:true},
     isExpired:{type:Boolean,default:false},
     createdAt: { type: Date, default: Date.now },
     updatedAt: { type: Date, default: Date.now }
})
const Drug = mongoose.model("Drug", drugSchema);
export default Drug;
