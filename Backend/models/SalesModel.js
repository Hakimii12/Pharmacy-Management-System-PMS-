import mongoose, { Schema } from "mongoose";
const salesSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, index: true },
  patientName: { type: String,},
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  // Denormalised at sale time so history survives the product being deleted.
  name: { type: String },
  brand: { type: String },
  dosageForm: { type: String },
  quantitySold: { type: Number, required: true },
  profit: { type: Number, required: true },
  saleAmount: { type: Number, required: true },
  sellingPrice: { type: Number },
  totalUnitPrice: { type: Number },
  status: { 
    type: String, 
    enum: ["pending", "completed", "aborted", "credit", "partial", "refunded"],
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
  refundedBy: { type: Schema.Types.ObjectId, ref: "User" },
  timestamp: { type: Date, default: Date.now }
});

// Index for credit management
salesSchema.index({ dueDate: 1, paymentStatus: 1 });
salesSchema.index({ customerPhone: 1 });
salesSchema.index({ saleType: 1, timestamp: 1 });

// Compound indexes matching how the controllers actually query.
// Transaction history and the pending-order queue filter on status then sort by timestamp.
salesSchema.index({ status: 1, timestamp: -1 });
// Recent sales and the dashboard sort completed sales by completion time.
salesSchema.index({ status: 1, completedAt: -1 });
// Confirm/abort/undo all look a transaction up by id and status.
salesSchema.index({ transactionId: 1, status: 1 });
// Daily balance close + daily transaction list, per cashier per day.
salesSchema.index({ cashier: 1, status: 1, completedAt: -1 });
// Credit ledger: credit sales filtered by payment state, newest first.
salesSchema.index({ saleType: 1, status: 1, paymentStatus: 1, timestamp: -1 });
// Per-product inventory history.
salesSchema.index({ product: 1, status: 1, completedAt: -1 });

const Sales = mongoose.model("Sales", salesSchema);
export default Sales;