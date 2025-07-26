import Store from "../models/StoreModel.js"
import Dispensary from "../models/DispensaryModel.js"
import Product from "../models/ProductModel.js"
import Notification from "../models/NotificationModel.js"

// Function to trigger notifications when inventory changes
export const triggerInventoryNotifications = async (productId) => {
  try {
    const product = await Product.findById(productId)
    const store = await Store.findOne({ product: productId })
    const dispensary = await Dispensary.findOne({ product: productId })

    if (!product) return

    // Check if product is completely sold out (both locations)
    const storeQty = store ? store.quantity : 0
    const dispensaryQty = dispensary ? dispensary.quantity : 0
    const totalQty = storeQty + dispensaryQty

    if (totalQty === 0) {
      // Create notification for complete sellout
      const existingComplete = await Notification.findOne({
        product: productId,
        location: "both",
        type: "OutOfStock",
        read: false,
      })

      if (!existingComplete) {
        await Notification.create({
          type: "OutOfStock",
          message: `Product ${product.name} is completely sold out in both store and dispensary.`,
          product: productId,
          location: "both",
          read: false,
        })
      }
    } else {
      // Remove complete sellout notification if stock is available
      await Notification.deleteMany({
        product: productId,
        location: "both",
        type: "OutOfStock",
        read: false,
      })
    }

    // Trigger individual location notifications by saving the documents
    if (store) {
      await store.save()
    }
    if (dispensary) {
      await dispensary.save()
    }
  } catch (error) {
    console.error("Error triggering inventory notifications:", error)
  }
}

// Function to clean up old notifications
export const cleanupNotifications = async (productId, location, currentStatus) => {
  try {
    if (currentStatus === "In Stock") {
      // Remove low stock and out of stock notifications for this location
      await Notification.deleteMany({
        product: productId,
        location: location,
        type: { $in: ["LowStock", "OutOfStock"] },
        read: false,
      })
    }
  } catch (error) {
    console.error("Error cleaning up notifications:", error)
  }
}
