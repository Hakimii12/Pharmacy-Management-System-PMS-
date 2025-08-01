import Product from "../models/ProductModel.js";
import Store from "../models/StoreModel.js";
import Dispensary from "../models/DispensaryModel.js";
import Notification from "../models/NotificationModel.js";
import cron from "node-cron";

export function startExpirationChecker() {
  // Run daily at 3 AM
  cron.schedule("0 3 * * *", async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Find all products that expire today or before
      const expiredProducts = await Product.find({
        expiryDate: { $lte: today },
        isDeleted: { $ne: true }
      });
      
      for (const product of expiredProducts) {
        // Update store status
        await Store.updateStatus(product._id);
        
        // Update dispensary status
        await Dispensary.updateStatus(product._id);
        
        // Create notifications
        await Notification.create([
          {
            type: "Expired",
            message: `Product ${product.name} has expired!`,
            product: product._id,
            location: "store",
            read: false,
          },
          {
            type: "Expired",
            message: `Product ${product.name} has expired!`,
            product: product._id,
            location: "dispensary",
            read: false,
          }
        ]);
      }
    } catch (error) {
      console.error("Expiration check failed:", error);
    }
  });
}