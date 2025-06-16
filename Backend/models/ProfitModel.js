import mongoose from "mongoose";
const profitSchema = new mongoose.Schema({
   daily: { type: Number, default: 0 },
  monthly: { type: Number, default: 0 },
  yearly: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
})
const Profit = mongoose.model("Profit", profitSchema)
export default Profit;