import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Expired", "OutOfStock", "NearExpiry", "LowStock"],
    required: true
  },
  message: { type: String, required: true },
  product: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Product", 
    required: true 
  },
  read: { type: Boolean, default: false },
  location: { 
    type: String, 
    enum: ["store", "dispensary", "both"], // Added "both" for NearExpiry
    required: true 
  },
  createdAt: { type: Date, default: Date.now }
});

// Compound index covering the most common query pattern:
// { product, type, read, location } used in findOne/deleteMany across model hooks
NotificationSchema.index({ product: 1, type: 1, read: 1, location: 1 });

const Notification = mongoose.model("Notification", NotificationSchema);
export default Notification;