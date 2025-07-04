import mongoose, { Schema } from "mongoose";
import Notification from "./NotificationModel.js";
const salesSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, index: true }, // Group multiple products
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  quantitySold: { type: Number, required: true },
  profit: { type: Number, required: true },
  saleAmount: { type: Number, required: true },
   status: { 
    type: String, 
    enum: ["pending", "completed", "aborted"], 
    default: "pending",
    index: true
  },
  pharmacist: { type: Schema.Types.ObjectId, ref: "User", required: true },
  cashier: { type: Schema.Types.ObjectId, ref: "User" },
  timestamp: { type: Date, default: Date.now }
});
const Sales = mongoose.model("Sales",salesSchema);
export default Sales;