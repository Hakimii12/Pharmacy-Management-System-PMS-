import mongoose from "mongoose"

const ProductSchema = new mongoose.Schema({
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true, index: true },
  type: { type: String },
  brand: { type: String },
  unitPrice: { type: Number, required: true },
  quantity: { type: Number, required: true }, // This is the total quantity across all locations
  visibility: { type: String, enum: ["enable", "disable", "deleted"], default: "enable" },
  totalPrice: { type: Number, required: true },
  batchNo: { type: String, required: true },
  expiryDate: { type: Date, required: true },
  markup: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  totalSellingPrice: { type: Number, required: true },
  DosageForms: { type: String },
  category: { type: String },
  distributor: {
    name: { type: String },
    contact: { type: Number },
  },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

// Update updatedAt on save
ProductSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

// Expiry/near-expiry notifications are NOT generated here. A post-save hook fires
// once per document, so a bulk import of N products issued ~4N sequential
// notification queries. Controllers now call
// `services/notificationService.js#syncExpiryNotifications` with the whole batch,
// which collapses to a single bulkWrite. `bulkWrite`/`updateMany` also bypass save
// middleware entirely, so nothing would run here on the bulk paths anyway.

// Ensure batchNo is unique only for non-deleted products
ProductSchema.index(
  { batchNo: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

// List endpoints always filter on visibility + isDeleted and sort by createdAt.
ProductSchema.index({ isDeleted: 1, visibility: 1, createdAt: -1 });
// Expiry sweeps (cron, near-expiry report, notification sync).
ProductSchema.index({ expiryDate: 1, isDeleted: 1 });
// Category facet on the inventory screens.
ProductSchema.index({ category: 1, isDeleted: 1 });

const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema)
export default Product
