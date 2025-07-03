import mongoose from "mongoose";
import Notification from "../models/NotificationModel.js";
const ProductSchema = new mongoose.Schema({
     addedBy:{type:mongoose.Schema.Types.ObjectId , ref:"User" ,required:true},
     name: {type:String , required:true,index:true},
     brand: {type:String,required:true, index:true},
     unitPrice:{type:Number , required:true},
     quantity:{type:Number , required:true},
     totalPrice:{type:Number,required:true},
     batchNo:{type:String,required:true,unique:true},
     expiryDate:{type:Date,required:true},
     markup:{type:Number,required:true},
     sellingPrice:{type:Number,required:true},
     // totalSellingPrice:{type:Number,required:true},
     isExpired:{type:Boolean,default:false},
     DosageForms:{ type:String,enum:["tablet","syrup","injection","ointment"]},
     ProductType:{ type:String,enum:["medicine","cosmetic","Supplements","Medical Equipment"]},
     distributor: {
    name: { type: String, required: true },
    licenseNumber: { type: String, required: true },
    contact: String
    },
    inventory: {
    store: { type: Number, default: 0 },
    dispensary: { type: Number, default: 0 },
    storeThreshold: { type: Number, default: 10 },
    dispensaryThreshold: { type: Number, default: 10 }
    },
     createdAt: { type: Date, default: Date.now },
     updatedAt: { type: Date, default: Date.now }
});
ProductSchema.pre("save",function(next){
     if(this.isModified("expiryDate")){
          const today = new Date()
          this.isExpired = this.expiryDate <=today;
     }
     next();
});
ProductSchema.post("save", async function(doc) {
  try {
    // 1. Out of Stock Checks (separate for each location)
    // For Store
    if (doc.inventory.store === 0) {
      const existingStoreOut = await Notification.findOne({
        product: doc._id,
        type: "OutOfStock",
        location: "store", // Track location
        read: false
      });
      
      if (!existingStoreOut) {
        await Notification.create({
          type: "OutOfStock",
          message: `${doc.name} is out of stock in STORE`,
          product: doc._id,
          location: "store" // Add location
        });
      }
    }

    // For Dispensary
    if (doc.inventory.dispensary === 0) {
      const existingDispensaryOut = await Notification.findOne({
        product: doc._id,
        type: "OutOfStock",
        location: "dispensary", // Track location
        read: false
      });
      
      if (!existingDispensaryOut) {
        await Notification.create({
          type: "OutOfStock",
          message: `${doc.name} is out of stock in DISPENSARY`,
          product: doc._id,
          location: "dispensary" // Add location
        });
      }
    }

    // 2. Low Stock Checks (separate for each location)
    // For Store
    if (doc.inventory.store < doc.inventory.storeThreshold) {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const existingStoreLow = await Notification.findOne({
        product: doc._id,
        type: "LowStock",
        location: "store", // Track location
        read: false,
        createdAt: { $gt: oneWeekAgo }
      });

      if (!existingStoreLow) {
        await Notification.create({
          type: "LowStock",
          message: `${doc.name} is LOW in STOCK in STORE (${doc.inventory.store} < ${doc.inventory.storeThreshold})`,
          product: doc._id,
          location: "store" // Add location
        });
      }
    }

    // For Dispensary
    if (doc.inventory.dispensary < doc.inventory.dispensaryThreshold) {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const existingDispensaryLow = await Notification.findOne({
        product: doc._id,
        type: "LowStock",
        location: "dispensary", // Track location
        read: false,
        createdAt: { $gt: oneWeekAgo }
      });

      if (!existingDispensaryLow) {
        await Notification.create({
          type: "LowStock",
          message: `${doc.name} is LOW in STOCK in DISPENSARY (${doc.inventory.dispensary} < ${doc.inventory.dispensaryThreshold})`,
          product: doc._id,
          location: "dispensary" // Add location
        });
      }
    }
  } catch (error) {
    console.error("Notification error:", error);
  }
});
const Product = mongoose.model("Product", ProductSchema);
export default Product;
