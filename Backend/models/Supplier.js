import mongoose from "mongoose"

const SupplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, index: true },
  contact: { type: String, trim: true },
  email: { type: String, trim: true },
  address: { type: String, trim: true },
  notes: { type: String, trim: true },
  isDeleted: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

SupplierSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

SupplierSchema.index({ name: 1, isDeleted: 1 })

const Supplier = mongoose.models.Supplier || mongoose.model("Supplier", SupplierSchema)
export default Supplier
