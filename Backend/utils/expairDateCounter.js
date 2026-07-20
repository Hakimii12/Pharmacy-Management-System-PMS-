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

      // Find all products that expire today or before (lean() — read-only)
      const expiredProducts = await Product.find(
        { expiryDate: { $lte: today }, isDeleted: { $ne: true } },
        { _id: 1, name: 1 }
      ).lean();

      if (expiredProducts.length === 0) return;

      // Update Store and Dispensary statuses in parallel batches
      await Promise.all(
        expiredProducts.flatMap((product) => [
          Store.updateStatus(product._id),
          Dispensary.updateStatus(product._id),
        ])
      );

      // Use bulkWrite with upsert to avoid creating duplicate notifications
      // If the notification already exists (same product+type+location+read:false)
      // we simply update the message; otherwise we insert a new one.
      const bulkOps = expiredProducts.flatMap((product) => [
        {
          updateOne: {
            filter: {
              product: product._id,
              type: "Expired",
              location: "store",
              read: false,
            },
            update: {
              $setOnInsert: {
                type: "Expired",
                message: `Product ${product.name} has expired!`,
                product: product._id,
                location: "store",
                read: false,
              },
            },
            upsert: true,
          },
        },
        {
          updateOne: {
            filter: {
              product: product._id,
              type: "Expired",
              location: "dispensary",
              read: false,
            },
            update: {
              $setOnInsert: {
                type: "Expired",
                message: `Product ${product.name} has expired!`,
                product: product._id,
                location: "dispensary",
                read: false,
              },
            },
            upsert: true,
          },
        },
      ]);

      if (bulkOps.length > 0) {
        await Notification.bulkWrite(bulkOps, { ordered: false });
      }

      console.log(`Expiration check complete: processed ${expiredProducts.length} expired products.`);
    } catch (error) {
      console.error("Expiration check failed:", error);
    }
  });
}