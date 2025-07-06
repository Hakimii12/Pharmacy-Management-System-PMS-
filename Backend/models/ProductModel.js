import mongoose from "mongoose";
import Notification from "../models/NotificationModel.js";
const ProductSchema = new mongoose.Schema({
     addedBy:{type:mongoose.Schema.Types.ObjectId , ref:"User" ,required:true},
     name: {type:String , required:true,index:true},
     brand: {type:String,required:true, index:true},
     unitPrice:{type:Number , required:true},
     patientName:{type:String},
     quantity:{type:Number , required:true},
     status:{type:String, enum:["In Stock","Low Stock","Sold Out","Expired"], default:"In Stock"},
     totalPrice:{type:Number,required:true},
     batchNo:{type:String,required:true,unique:true},
     expiryDate:{type:Date,required:true},
     markup:{type:Number,required:true},
     sellingPrice:{type:Number,required:true},
     // totalSellingPrice:{type:Number,required:true},
     isExpired:{type:Boolean,default:false},
     DosageForms:{ type:String,enum:["tablet","syrup","injection","ointment"]},
     category:{ type:String,enum:["medicine","cosmetic","Supplements","Medical Equipment"]},
     distributor: {
    name: { type: String, required: true },
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
ProductSchema.pre("save", function(next) {
  // Expiry logic
  if (this.isModified("expiryDate")) {
    const today = new Date();
    this.isExpired = this.expiryDate <= today
    this.status = "Expired";
  }

  // Status logic
  if (this.quantity === 0) {
    this.status = "Sold Out";
  } else if (this.inventory && this.inventory.store <= this.inventory.storeThreshold) {
    this.status = "Low Stock";
  } else {
    this.status = "In Stock";
  }

  next();
});
ProductSchema.post('save', async function(doc) {
  const locations = ['store', 'dispensary'];
  
  for (const loc of locations) {
    const quantity = doc.inventory[loc];
    const threshold = doc.inventory[`${loc}Threshold`];
    
    let type, message;
    
    if (quantity === 0) {
      type = "OutOfStock";
      message = `Product ${doc.name} is out of stock in ${loc}.`;
    } else if (quantity < threshold) {
      type = "LowStock";
      message = `Product ${doc.name} is low in ${loc}. Current: ${quantity}, Threshold: ${threshold}.`;
    } else {
      continue;
    }

    // Check for existing notification
    const existing = await Notification.findOne({
      product: doc._id,
      location: loc,
      type,
      read: false
    });

    if (!existing) {
      await Notification.create({
        type,
        message,
        product: doc._id,
        location: loc,
        read: false
      });
    }
  }
});
const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema);
export default Product;
