import mongoose from "mongoose";
const dailyBalanceSchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  expectedAmount: { type: Number, required: true },
  countedAmount: { type: Number },
  status: {
    type: String,
    enum: ["pending", "verified", "discrepancy"],
    default: "pending"
  },
  transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Sales" }],
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  discrepancyNote: String,
  timestamp: { type: Date, default: Date.now }
});

const DailyBalance = mongoose.model("DailyBalance", dailyBalanceSchema);
export default DailyBalance;