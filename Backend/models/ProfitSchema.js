import mongoose from "mongoose";
const profitSchema = new mongoose.Schema({
    daily:Number,
    monthly:Number,
    yearly:Number,
    updatedAt:Date
})
const Profit = mongoose.model("Profit", profitSchema)
export default Profit;