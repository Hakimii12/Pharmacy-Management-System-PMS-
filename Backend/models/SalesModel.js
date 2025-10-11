import mongoose, { Schema } from "mongoose";
import User from "./UserModel.js";
const salesSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, index: true },
  patientName: { type: String,},
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  quantitySold: { type: Number, required: true },
  profit: { type: Number, required: true },
  saleAmount: { type: Number, required: true },
  sellingPrice: { type: Number },
  totalUnitPrice: { type: Number },
  status: { 
    type: String, 
    enum: ["pending", "completed", "credit", "partial", "refunded"],
    index: true
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "partial", "credit", "overdue"],
    default: "pending"
  },
  amountPaid: { type: Number, default: 0 },
  remainingBalance: { type: Number, default: 0 },
  dueDate: { type: Date },
  // New fields for customer information
  customerPhone: { type: String },
  customerAddress: { type: String },
  saleType: {
    type: String,
    enum: ["cash", "credit"],
    default: "cash"
  },
  // Credit sale specific fields
  creditApprovedBy: { type: Schema.Types.ObjectId, ref: "User" },
  creditApprovedAt: { type: Date },
  lastPaymentDate: { type: Date },
  paymentHistory: [{
    amount: { type: Number, required: true },
    paymentDate: { type: Date, default: Date.now },
    paymentMethod: { type: String, enum: ["cash", "bank_transfer", "mobile_money"] },
    receivedBy: { type: Schema.Types.ObjectId, ref: "User" },
    notes: { type: String }
  }],
  pharmacist: { type: Schema.Types.ObjectId, ref: "User", required: true },
  cashier: { type: Schema.Types.ObjectId, ref: "User" },
  completedAt: { type: Date },
  abortedAt: { type: Date },
  refundedAt: { type: Date },
  timestamp: { type: Date, default: Date.now }
});

// Index for credit management
salesSchema.index({ dueDate: 1, paymentStatus: 1 });
salesSchema.index({ customerPhone: 1 });
salesSchema.index({ saleType: 1, timestamp: 1 });

const Sales = mongoose.model("Sales", salesSchema);
export default Sales;