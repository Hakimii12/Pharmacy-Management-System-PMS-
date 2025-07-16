import mongoose from "mongoose"

const DispensarySchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
    unique: true,
  },
  quantity: {
    type: Number,
    default: 0,
    min: 0,
  },
  threshold: {
    type: Number,
    default: 10,
    min: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

DispensarySchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

const Dispensary = mongoose.model("Dispensary", DispensarySchema)
export default Dispensary
