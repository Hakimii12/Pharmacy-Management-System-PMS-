import mongoose from "mongoose";
import Notification from "../models/NotificationModel.js";
const ProductSchema = new mongoose.Schema({
     addedBy:{type:mongoose.Schema.Types.ObjectId , ref:"User" ,required:true},
     name: {type:String , required:true,index:true},
     brand: {type:String,required:true, index:true},
     unitPrice:{type:Number , required:true},
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
     const today = new Date();
     today.setHours(0, 0, 0, 0);
  if (this.isModified("expiryDate")) {
    const today = new Date();
    today.setHours(0, 0, 0, 0)
    this.isExpired = this.expiryDate <= today
    this.status = "Expired";
  }
  // Status logic
  if (this.quantity === 0) {
    this.status = "Sold Out";
  } else if (this.inventory && this.inventory.store <= this.inventory.storeThreshold && this.expiryDate > today) {
    this.status = "Low Stock";
  } else if(this.expiryDate <= today){
    this.status = "Expired";
    this.isExpired=this.expiryDate <= today
  }else if(this.inventory.store > this.inventory.storeThreshold && this.expiryDate > today ){
    this.status = "In Stock";
  }
  next();
});
ProductSchema.post('save', async function(doc) {
  const today = new Date();
     today.setHours(0, 0, 0, 0);
  const locations = ['store', 'dispensary'];
  
  for (const loc of locations) {
    const quantity = doc.inventory[loc];
    const threshold = doc.inventory[`${loc}Threshold`];
    
    let type, message;
    
    if (quantity === 0) {
      type = "OutOfStock";
      message = `Product ${doc.name} is out of stock in ${loc}.`;
    } else if (quantity < threshold && doc.expiryDate > today ) {
      type = "LowStock";
      message = `Product ${doc.name} is low in ${loc}. Current: ${quantity}, Threshold: ${threshold}.`;
    } 
    else if(doc.expiryDate <= today || doc.isExpired){
      type ="Expired";
      message = `Product ${doc.name} is Expired.`;
    }
    else {
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
  const threeMonthFromNow = new Date(today);
  threeMonthFromNow.setMonth(threeMonthFromNow.getMonth() + 3)
  if(!doc.isExpired && doc.expiryDate > today){
    const isNearExpiry = doc.expiryDate <=threeMonthFromNow;
    if(isNearExpiry){
      const existingNearExpiry = await Notification.findOne({
        product: doc._id,
        type: "NearExpiry",
        location: "both",
        read: false
      })
       if (!existingNearExpiry) {
        await Notification.create({
          type: "NearExpiry",
          message: `Product ${doc.name}_${doc.brand} expires on ${doc.expiryDate.toDateString()}.`,
          product: doc._id,
          location: "both",
          read: false
        });
      }
    }
  }
});
const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema);
export default Product;
