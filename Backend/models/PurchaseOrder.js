import mongoose from "mongoose"

const PurchaseLineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    brand: { type: String, trim: true, default: "no_brand" },
    category: { type: String, trim: true, default: "" },
    DosageForms: { type: String, trim: true, default: "" },
    quantityOrdered: { type: Number, required: true, min: 1 },
    quantityReceived: { type: Number, default: 0, min: 0 },
    unitCost: { type: Number, required: true, min: 0 },
    markup: { type: Number, default: 20, min: 0 },
    batchNo: { type: String, trim: true },
    expiryDate: { type: Date },
    /** Product batch created when this line was received. */
    receivedProduct: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    notes: { type: String, trim: true },
  },
  { _id: true },
)

const PurchaseOrderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true, index: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
  status: {
    type: String,
    enum: ["draft", "ordered", "partial", "received", "cancelled"],
    default: "draft",
    index: true,
  },
  lines: { type: [PurchaseLineSchema], default: [] },
  notes: { type: String, trim: true },
  expectedDate: { type: Date },
  orderedAt: { type: Date },
  receivedAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

PurchaseOrderSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

PurchaseOrderSchema.index({ status: 1, createdAt: -1 })
PurchaseOrderSchema.index({ supplier: 1, createdAt: -1 })

const PurchaseOrder =
  mongoose.models.PurchaseOrder || mongoose.model("PurchaseOrder", PurchaseOrderSchema)
export default PurchaseOrder
