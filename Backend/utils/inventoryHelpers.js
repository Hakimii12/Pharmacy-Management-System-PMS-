import Store from "../models/StoreModel.js";
import Dispensary from "../models/DispensaryModel.js";
import Product from "../models/ProductModel.js";

export const updateInventoryStatus = async (productId) => {
  try {
    const store = await Store.findOne({ where: { productId } });
    const dispensary = await Dispensary.findOne({ where: { productId } });

    if (store) {
      await store.save();
    }

    if (dispensary) {
      await dispensary.save();
    }

    const product = await Product.findByPk(productId);
    if (product) {
      await product.save();
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating inventory status:", error);
    return { success: false, error: error.message };
  }
};

export const getInventoryStatus = async (productId) => {
  try {
    const product = await Product.findByPk(productId);
    if (!product) return null;

    const store = await Store.findOne({ where: { productId } });
    const dispensary = await Dispensary.findOne({ where: { productId } });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isExpired = new Date(product.expiryDate) <= today;

    return {
      product: {
        name: product.name,
        brand: product.brand,
        overallStatus: product.visibility,
        isExpired,
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
    };
  } catch (error) {
    console.error("Error getting inventory status:", error);
    return null;
  }
};
