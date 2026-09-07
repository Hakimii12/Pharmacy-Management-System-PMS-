import mongoose from "mongoose"
import Notification from "./NotificationModel.js"
import { sumLocationStockForIdentity } from "../utils/productIdentity.js"

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
  initialStoreQty: {
    type: Number,
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
  try {
    const productDoc = await mongoose.model("Product").findById(doc.product)
    if (!productDoc) return

    // Expiry stays batch-specific — only that lot is expired.
    if (doc.isExpired && doc.quantity > 0 && !doc.isDeleted && doc.isActive) {
      const existingExpired = await Notification.findOne({
        product: doc.product,
        location: "store",
        type: "Expired",
        read: false,
      })
      if (!existingExpired) {
        await Notification.create({
          type: "Expired",
          message: `Product ${productDoc.name} (batch ${productDoc.batchNo || "—"}) is expired in store.`,
          product: doc.product,
          location: "store",
          read: false,
        })
      }
    } else {
      await Notification.deleteMany({
        product: doc.product,
        location: "store",
        type: "Expired",
        read: false,
      })
    }

    // Low / out-of-stock alerts use the combined total across sibling batches.
    const stock = await sumLocationStockForIdentity(productDoc, "store")
    if (stock.siblingIds.length === 0) return

    await Notification.deleteMany({
      product: { $in: stock.siblingIds },
      location: "store",
      type: { $in: ["LowStock", "OutOfStock"] },
      read: false,
    })

    if (stock.usable <= 0) {
      if (stock.total <= 0) {
        await Notification.create({
          type: "OutOfStock",
          message: `Product ${productDoc.name} is out of stock in store.`,
          product: doc.product,
          location: "store",
          read: false,
        })
      }
      return
    }

    if (stock.usable <= stock.threshold) {
      await Notification.create({
        type: "LowStock",
        message: `Product ${productDoc.name} is low in store. Current: ${stock.usable}, Threshold: ${stock.threshold}.`,
        product: doc.product,
        location: "store",
        read: false,
      })
    }
  } catch (error) {
    console.error("Store notification hook failed:", error)
  }
})

StoreSchema.statics.updateStatus = async function (productId, session = null) {
  const options = session ? { session } : {}
  const store = await this.findOne({ product: productId }, null, options)
  if (!store) return

  await store.updateStatusFields()
  await store.save(options)
}

StoreSchema.methods.updateStatusFields = async function () {
  const product = await mongoose.model("Product").findById(this.product)
  if (!product || this.isDeleted || !this.isActive) {
    this.status = "Sold Out"
    this.isExpired = false
    return
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  this.isExpired = product.expiryDate <= today

  if (this.isExpired) {
    this.status = "Expired"
  } else if (this.quantity === 0) {
    this.status = "Sold Out"
  } else if (this.quantity <= this.threshold) {
    this.status = "Low Stock"
  } else {
    this.status = "In Stock"
  }
}

StoreSchema.pre("save", async function (next) {
  this.updatedAt = Date.now()
  await this.updateStatusFields()
  next()
})

StoreSchema.pre(/^find/, function () {
  if (!this.getQuery().isDeleted) {
    this.find({ isDeleted: { $ne: true } })
  }
})

const Store = mongoose.model("Store", StoreSchema)
export default Store
