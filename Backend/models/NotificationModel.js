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
  location: { type: String, enum: ["store", "dispensary", "both"] },
  createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model("Notification", NotificationSchema);
export default Notification;