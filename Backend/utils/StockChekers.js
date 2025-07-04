 import Product from "../models/ProductModel.js";
 import Notification from "../models/NotificationModel.js";
 async function StockChecker(productId) {
   const product = await Product.findById(productId);
  if (product.inventory.store === 0 && product.inventory.dispensary === 0) {
    const existing = await Notification.findOne({
      product: productId,
      type: "OutOfStock",
      read: false,
      Location:"both"
    });
    
    if (!existing) {
      await Notification.create({
        type: "OutOfStock",
        message: `${product.name} (${product.batchNo}) is out of stock in both store and dispensary`,
        product: productId,
        location:"both"
      });
    }
  }
  if (product.inventory.store < product.inventory.storeThreshold){
     const existing = await Notification.findOne({
      product: productId,
      type: "OutOfStock",
      read: false,
      Location:"store"
    });
    
    if (!existing) {
      await Notification.create({
        type: "OutOfStock",
        message: `${product.name} (${product.batchNo}) is out of stock from store`,
        product: productId,
        location:"store"
      });
    }
  }
  if (product.inventory.dispensary < product.inventory.dispensaryThreshold) {
    const existing = await Notification.findOne({
      product: productId,
      type: "OutOfStock",
      read: false,
      Location:"dispensary"
    });
    
    if (!existing) {
      await Notification.create({
        type: "OutOfStock",
        message: `${product.name} (${product.batchNo}) is out of stock from dispensary`,
        product: productId,
        location:"dispensary"
      });
    }
  }
}
export default StockChecker;