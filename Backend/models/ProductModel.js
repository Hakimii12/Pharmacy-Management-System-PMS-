import mongoose from "mongoose"
import Notification from "./NotificationModel.js"
import Store from "./StoreModel.js"
import Dispensary from "./DispensaryModel.js"

const ProductSchema = new mongoose.Schema({
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true, index: true },
  brand: { type: String, required: true },
  unitPrice: { type: Number, required: true },
  quantity: { type: Number, required: true },
  visibility: { type: String, enum: ["enable", "disable"], default: "enable" },
  status: { type: String, enum: ["In Stock", "Low Stock", "Sold Out", "Expired"], default: "In Stock" },
  totalPrice: { type: Number, required: true },
  batchNo: { type: String, required: true },
  expiryDate: { type: Date, required: true },
  markup: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  isExpired: { type: Boolean, default: false },
  DosageForms: { type: String, enum: ["tablet", "syrup", "injection", "ointment", "-"] },
  category: { type: String, enum: ["medicine", "cosmetic", "supplement", "Medical Equipment", "Other"] },
  distributor: {
    name: { type: String, required: true },
    contact: String,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

ProductSchema.pre("save", async function (next) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get store and dispensary quantities
  const store = await Store.findOne({ product: this._id })
  const dispensary = await Dispensary.findOne({ product: this._id })

  const storeQty = store ? store.quantity : 0
  const dispensaryQty = dispensary ? dispensary.quantity : 0
  const storeThreshold = store ? store.threshold : 10

  // Expiry logic
  if (this.isModified("expiryDate")) {
    this.isExpired = this.expiryDate <= today
    if (this.isExpired) {
      this.status = "Expired"
    }
  }

  // Status logic
  if (this.quantity === 0) {
    this.status = "Sold Out"
  } else if (storeQty <= storeThreshold && this.expiryDate > today) {
    this.status = "Low Stock"
  } else if (this.expiryDate <= today) {
    this.status = "Expired"
    this.isExpired = true
  } else if (storeQty > storeThreshold && this.expiryDate > today) {
    this.status = "In Stock"
  }

  next()
})

ProductSchema.post("save", async (doc) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get store and dispensary data
  const store = await Store.findOne({ product: doc._id })
  const dispensary = await Dispensary.findOne({ product: doc._id })

  const locations = [
    { name: "store", quantity: store ? store.quantity : 0, threshold: store ? store.threshold : 10 },
    {
      name: "dispensary",
      quantity: dispensary ? dispensary.quantity : 0,
      threshold: dispensary ? dispensary.threshold : 10,
    },
  ]

  for (const loc of locations) {
    let type, message

    if (loc.quantity === 0) {
      type = "OutOfStock"
      message = `Product ${doc.name} is out of stock in ${loc.name}.`
    } else if (loc.quantity < loc.threshold && doc.expiryDate > today) {
      type = "LowStock"
      message = `Product ${doc.name} is low in ${loc.name}. Current: ${loc.quantity}, Threshold: ${loc.threshold}.`
    } else if (doc.expiryDate <= today || doc.isExpired) {
      type = "Expired"
      message = `Product ${doc.name} is Expired.`
    } else {
      continue
    }

    // Check for existing notification
    const existing = await Notification.findOne({
      product: doc._id,
      location: loc.name,
      type,
      read: false,
    })

    if (!existing) {
      await Notification.create({
        type,
        message,
        product: doc._id,
        location: loc.name,
        read: false,
      })
    }
  }

  // Near expiry notification
  const threeMonthFromNow = new Date(today)
  threeMonthFromNow.setMonth(threeMonthFromNow.getMonth() + 3)

  if (!doc.isExpired && doc.expiryDate > today) {
    const isNearExpiry = doc.expiryDate <= threeMonthFromNow
    if (isNearExpiry) {
      const existingNearExpiry = await Notification.findOne({
        product: doc._id,
        type: "NearExpiry",
        location: "both",
        read: false,
      })

      if (!existingNearExpiry) {
        await Notification.create({
          type: "NearExpiry",
          message: `Product ${doc.name}_${doc.brand} expires on ${doc.expiryDate.toDateString()}.`,
          product: doc._id,
          location: "both",
          read: false,
        })
      }
    }
  }
})

// Virtual to maintain backward compatibility
ProductSchema.virtual("inventory").get(async function () {
  const store = await Store.findOne({ product: this._id })
  const dispensary = await Dispensary.findOne({ product: this._id })

  return {
    store: store ? store.quantity : 0,
    dispensary: dispensary ? dispensary.quantity : 0,
    storeThreshold: store ? store.threshold : 10,
    dispensaryThreshold: dispensary ? dispensary.threshold : 10,
  }
})

const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema)
export default Product
