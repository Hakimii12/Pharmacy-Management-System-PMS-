import mongoose from "mongoose"
import Notification from "./NotificationModel.js"

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
  initialStoreQty:{
    type:Number
  },
  threshold: {
    type: Number,
    default: 10,
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  // New fields for status and expiry specific to store
  status: { type: String, enum: ["In Stock", "Low Stock", "Sold Out", "Expired"], default: "In Stock" },
  isExpired: { type: Boolean, default: false },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})



StoreSchema.post("save", async (doc) => {
  const productDoc = await mongoose.model("Product").findById(doc.product)
  if (!productDoc) return // Product might have been hard deleted

  let type, message
  if (doc.quantity === 0) {
    type = "OutOfStock"
    message = `Product ${productDoc.name} is out of stock in store.`
  } else if (doc.quantity <= doc.threshold && !doc.isExpired) {
    type = "LowStock"
    message = `Product ${productDoc.name} is low in store. Current: ${doc.quantity}, Threshold: ${doc.threshold}.`
  } else if (doc.isExpired) {
    type = "Expired"
    message = `Product ${productDoc.name} is Expired in store.`
  } else {
    // If status is In Stock, ensure no old notifications exist for this location
    await Notification.deleteMany({
      product: doc.product,
      location: "store",
      type: { $in: ["OutOfStock", "LowStock", "Expired"] },
      read: false,
    })
    return
  }

  const existing = await Notification.findOne({
    product: doc.product,
    location: "store",
    type,
    read: false,
  })

  if (!existing) {
    await Notification.create({
      type,
      message,
      product: doc.product,
      location: "store",
      read: false,
    })
  }
})
// Add this static method to the StoreSchema
StoreSchema.statics.updateStatus = async function (productId, session = null) {
  const options = session ? { session } : {};
  const store = await this.findOne({ product: productId }, null, options);
  if (!store) return;

  await store.updateStatusFields();
  await store.save(options);
};

// Add this instance method to the StoreSchema
StoreSchema.methods.updateStatusFields = async function () {
  const product = await mongoose.model("Product").findById(this.product);
  if (!product || this.isDeleted || !this.isActive) {
    this.status = "Sold Out";
    this.isExpired = false;
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Always calculate expiration first
  this.isExpired = product.expiryDate <= today;
  
  // Prioritize expired status above all else
  if (this.isExpired) {
    this.status = "Expired";
  } else if (this.quantity === 0) {
    this.status = "Sold Out";
  } else if (this.quantity <= this.threshold) {
    this.status = "Low Stock";
  } else {
    this.status = "In Stock";
  }
};

// Update the pre-save hook to use the new method
StoreSchema.pre("save", async function (next) {
  this.updatedAt = Date.now();
  await this.updateStatusFields();
  next();
});
// Query middleware to exclude deleted store records by default
StoreSchema.pre(/^find/, function () {
  if (!this.getQuery().isDeleted) {
    this.find({ isDeleted: { $ne: true } })
  }
})

const Store = mongoose.model("Store", StoreSchema)
export default Store
