import mongoose, { Schema } from "mongoose";;
const salesSchema = new mongoose.Schema({
    product:{type:Schema.Types.ObjectId, ref:"Product",required :true},
    quantitySold:Number,
    profit:Number,
    timestamp:{type:Date, default:Date.now}
})
const Sales = mongoose.model("Sales",salesSchema);
export default Sales;