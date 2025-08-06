import mongoose from "mongoose"
import Notification from "./NotificationModel.js"

const ProductSchema = new mongoose.Schema({
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true, index: true },
  type: { type: String },
  brand: { type: String },
  unit:{type:String},
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
    name: { type: String, required: true },
    contact: String,
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

// Post-save hook for product-level notifications (e.g., Near Expiry)
// Replace the existing post-save hook with this improved logic:
ProductSchema.post("save", async (doc) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // First handle expiration notifications (highest priority)
  if (doc.expiryDate <= today) {
    // Create expired notifications for both locations
    await Notification.create([
      {
        type: "Expired",
        message: `Product ${doc.name} has expired!`,
        product: doc._id,
        location: "store",
        read: false,
      },
      {
        type: "Expired",
        message: `Product ${doc.name} has expired!`,
        product: doc._id,
        location: "dispensary",
        read: false,
      }
    ]);
    
    // Remove any near-expiry notifications
    await Notification.deleteMany({
      product: doc._id,
      type: "NearExpiry",
      location: "both",
      read: false,
    });
    return;
  }

  // Then handle near-expiry (within 3 months)
  const threeMonthsFromNow = new Date(today);
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

  if (doc.expiryDate > today && doc.expiryDate <= threeMonthsFromNow) {
    const daysLeft = Math.ceil((doc.expiryDate - today) / (1000 * 60 * 60 * 24));
    
    const existingNearExpiry = await Notification.findOne({
      product: doc._id,
      type: "NearExpiry",
      location: "both",
      read: false,
    });
    
    if (!existingNearExpiry) {
      await Notification.create({
        type: "NearExpiry",
        message: `Product ${doc.name} expires in ${daysLeft} days!`,
        product: doc._id,
        location: "both",
        read: false,
      });
    }
  } else {
    // Remove near-expiry notifications if not applicable
    await Notification.deleteMany({
      product: doc._id,
      type: "NearExpiry",
      location: "both",
      read: false,
    });
  }
});

// Ensure batchNo is unique only for non-deleted products
ProductSchema.index(
  { batchNo: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema)
export default Product
