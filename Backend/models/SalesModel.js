import mongoose, { Schema } from "mongoose";;
const salesSchema = new mongoose.Schema({
    drug:{type:Schema.Types.ObjectId, ref:"Drug"},
    quantitySold:Number,
    profit:Number,
    timestamp:{type:Date, default:Date.now}
})
const Sales = mongoose.model("Sales",salesSchema);
export default Sales;