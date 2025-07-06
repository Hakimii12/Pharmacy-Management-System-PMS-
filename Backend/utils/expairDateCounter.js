import cron from "node-cron";
import Product from "../models/ProductModel.js";
import Notification from "../models/NotificationModel.js";
cron.schedule("0 0 * * *", async () => { // Runs daily at midnight
  const today = new Date();
  const threeMonthsLater = new Date();
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

  // Expired Products
  const expiredProducts = await Product.find({
    expiryDate: { $lte: today },
    isExpired: false
  });

  for (const product of expiredProducts) {
    product.isExpired = true;
    product.status="Expired"
    await product.save();
    
    await Notification.create({
      type: "Expired",
      message: `${product.name} (${product.batchNo}) expired on ${product.expiryDate.toDateString()}`,
      product: product._id
    });
  }

  // Near-Expiry Products (within 3 months)
  const nearExpiryProducts = await Product.find({
    expiryDate: { $gt: today, $lte: threeMonthsLater },
    isExpired: false
  });

  for (const product of nearExpiryProducts) {
    const existing = await Notification.findOne({
      product: product._id,
      type: "NearExpiry",
      read: false
    });

    if (!existing) {
      await Notification.create({
        type: "NearExpiry",
        message: `${product.name} (${product.batchNo}) expires on ${product.expiryDate.toDateString()} (within 3 months)`,
        product: product._id
      });
    }
  }
});
