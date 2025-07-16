import mongoose from "mongoose"

const StoreSchema = new mongoose.Schema({
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

StoreSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

const Store = mongoose.model("Store", StoreSchema)
export default Store
