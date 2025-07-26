import Store from "../models/StoreModel.js"
import Dispensary from "../models/DispensaryModel.js"
import Product from "../models/ProductModel.js"

// Helper function to update inventory status
export const updateInventoryStatus = async (productId) => {
  try {
    const store = await Store.findOne({ product: productId })
    const dispensary = await Dispensary.findOne({ product: productId })

    // Update store status if exists
    if (store) {
      await store.save() // This will trigger the pre-save hook to update status
    }

    // Update dispensary status if exists
    if (dispensary) {
      await dispensary.save() // This will trigger the pre-save hook to update status
    }

    // Update product status
    const product = await Product.findById(productId)
    if (product) {
      await product.save() // This will trigger the pre-save hook to update overall status
    }

    return { success: true }
  } catch (error) {
    console.error("Error updating inventory status:", error)
    return { success: false, error: error.message }
  }
}

// Helper function to get complete inventory status
export const getInventoryStatus = async (productId) => {
  try {
    const product = await Product.findById(productId)
    const store = await Store.findOne({ product: productId })
    const dispensary = await Dispensary.findOne({ product: productId })

    return {
      product: {
        name: product.name,
        brand: product.brand,
        overallStatus: product.status,
        isExpired: product.isExpired,
        expiryDate: product.expiryDate,
      },
      store: {
        quantity: store ? store.quantity : 0,
        threshold: store ? store.threshold : 10,
        status: store ? store.status : "Sold Out",
      },
      dispensary: {
        quantity: dispensary ? dispensary.quantity : 0,
        threshold: dispensary ? dispensary.threshold : 10,
        status: dispensary ? dispensary.status : "Sold Out",
      },
      totalQuantity: (store ? store.quantity : 0) + (dispensary ? dispensary.quantity : 0),
    }
  } catch (error) {
    console.error("Error getting inventory status:", error)
    return null
  }
}
