import { Op } from "sequelize";
import Product from "../models/ProductModel.js";
import Store from "../models/StoreModel.js";
import Dispensary from "../models/DispensaryModel.js";
import Notification from "../models/NotificationModel.js";
import cron from "node-cron";

export function startExpirationChecker() {
  cron.schedule("0 3 * * *", async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const expiredProducts = await Product.findAll({
        where: {
          expiryDate: { [Op.lte]: today },
          isDeleted: false,
        },
        attributes: ["id", "name"],
        raw: true,
      });

      if (expiredProducts.length === 0) return;

      await Promise.all(
        expiredProducts.flatMap((product) => [
          Store.updateStatus(product.id),
          Dispensary.updateStatus(product.id),
        ])
      );

      for (const product of expiredProducts) {
        for (const loc of ["store", "dispensary"]) {
          const existing = await Notification.findOne({
            where: {
              productId: product.id,
              type: "Expired",
              location: loc,
              read: false,
            },
          });
          if (!existing) {
            await Notification.create({
              productId: product.id,
              type: "Expired",
              location: loc,
              message: `Product ${product.name} has expired!`,
              read: false,
            });
          }
        }
      }

      console.log(`Expiration check complete: processed ${expiredProducts.length} expired products.`);
    } catch (error) {
      console.error("Expiration check failed:", error);
    }
  });
}