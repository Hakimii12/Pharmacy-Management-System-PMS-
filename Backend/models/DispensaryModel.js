import mongoose from "mongoose"
import Notification from "./NotificationModel.js"

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
  // New fields for status and expiry specific to dispensary
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

DispensarySchema.pre("save", async function (next) {
  this.updatedAt = Date.now()
  const product = await this.model("Product").findById(this.product)

  if (!product || this.isDeleted || !this.isActive) {
    this.status = "Sold Out" // If product is gone or dispensary record is inactive/deleted
    this.isExpired = false
    return next()
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  this.isExpired = product.expiryDate <= today

  if (this.quantity === 0) {
    this.status = "Sold Out"
  } else if (this.isExpired) {
    this.status = "Expired"
  } else if (this.quantity <= this.threshold) {
    this.status = "Low Stock"
  } else {
    this.status = "In Stock"
  }
  next()
})

DispensarySchema.post("save", async (doc) => {
  const productDoc = await mongoose.model("Product").findById(doc.product)
  if (!productDoc) return // Product might have been hard deleted

  let type, message
  if (doc.quantity === 0) {
    type = "OutOfStock"
    message = `Product ${productDoc.name} is out of stock in dispensary.`
  } else if (doc.quantity <= doc.threshold && !doc.isExpired) {
    type = "LowStock"
    message = `Product ${productDoc.name} is low in dispensary. Current: ${doc.quantity}, Threshold: ${doc.threshold}.`
  } else if (doc.isExpired) {
    type = "Expired"
    message = `Product ${productDoc.name} is Expired in dispensary.`
  } else {
    // If status is In Stock, ensure no old notifications exist for this location
    await Notification.deleteMany({
      product: doc.product,
      location: "dispensary",
      type: { $in: ["OutOfStock", "LowStock", "Expired"] },
      read: false,
    })
    return
  }

  const existing = await Notification.findOne({
    product: doc.product,
    location: "dispensary",
    type,
    read: false,
  })

  if (!existing) {
    await Notification.create({
      type,
      message,
      product: doc.product,
      location: "dispensary",
      read: false,
    })
  }
})
// Add this static method to the DispensarySchema
DispensarySchema.statics.updateStatus = async function (productId, session = null) {
  const options = session ? { session } : {};
  const dispensary = await this.findOne({ product: productId }, null, options);
  if (!dispensary) return;

  // We call the method to update the status fields
  await dispensary.updateStatusFields();

  // Save the document with the same session if provided
  await dispensary.save(options);
};

// Add this instance method to the DispensarySchema
DispensarySchema.methods.updateStatusFields = async function () {
  const product = await mongoose.model("Product").findById(this.product);
  if (!product || this.isDeleted || !this.isActive) {
    this.status = "Sold Out";
    this.isExpired = false;
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  this.isExpired = product.expiryDate <= today;
  
  // FIX: Use <= instead of < for proper threshold comparison
  if (this.quantity === 0) {
    this.status = "Sold Out";
  } else if (this.isExpired) {
    this.status = "Expired";
  } else if (this.quantity <= this.threshold) { // Fixed comparison here
    this.status = "Low Stock";
  } else {
    this.status = "In Stock";
  }
};

// Update the pre-save hook to use the new method
DispensarySchema.pre("save", async function (next) {
  this.updatedAt = Date.now();
  await this.updateStatusFields();
  next();
});
// Query middleware to exclude deleted dispensary records by default
DispensarySchema.pre(/^find/, function () {
  if (!this.getQuery().isDeleted) {
    this.find({ isDeleted: { $ne: true } })
  }
})

const Dispensary = mongoose.model("Dispensary", DispensarySchema)
export default Dispensary
