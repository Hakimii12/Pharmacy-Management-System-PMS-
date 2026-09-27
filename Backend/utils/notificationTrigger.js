import { Op } from "sequelize";
import Store from "../models/StoreModel.js";
import Dispensary from "../models/DispensaryModel.js";
import Product from "../models/ProductModel.js";
import Notification from "../models/NotificationModel.js";
import { sumLocationStockForIdentity } from "./productIdentity.js";

export const triggerInventoryNotifications = async (productId) => {
  try {
    const product = await Product.findByPk(productId);
    if (!product) return;

    const storeStock = await sumLocationStockForIdentity(product, "store");
    const dispStock = await sumLocationStockForIdentity(product, "dispensary");

    const totalUsable = storeStock.usable + dispStock.usable;
    const totalAll = storeStock.total + dispStock.total;

    if (totalUsable <= 0 && totalAll <= 0) {
      const existingComplete = await Notification.findOne({
        where: {
          productId: { [Op.in]: storeStock.siblingIds },
          location: "both",
          type: "OutOfStock",
          read: false,
        },
      });

      if (!existingComplete) {
        await Notification.create({
          type: "OutOfStock",
          message: `Product ${product.name} is completely sold out in both store and dispensary.`,
          productId,
          location: "both",
          read: false,
        });
      }
    } else {
      await Notification.destroy({
        where: {
          productId: { [Op.in]: storeStock.siblingIds },
          location: "both",
          type: "OutOfStock",
          read: false,
        },
      });
    }

    const store = await Store.findOne({ where: { productId } });
    const dispensary = await Dispensary.findOne({ where: { productId } });
    if (store) {
      await store.save();
    }
    if (dispensary) {
      await dispensary.save();
    }
  } catch (error) {
    console.error("Error triggering inventory notifications:", error);
  }
};

export const cleanupNotifications = async (productId, location, currentStatus) => {
  try {
    const product = await Product.findByPk(productId);
    if (!product) return;

    const stock = await sumLocationStockForIdentity(product, location);
    if (currentStatus === "In Stock" || stock.usable > stock.threshold) {
      await Notification.destroy({
        where: {
          productId: { [Op.in]: stock.siblingIds },
          location,
          type: { [Op.in]: ["LowStock", "OutOfStock"] },
          read: false,
        },
      });
    }
  } catch (error) {
    console.error("Error cleaning up notifications:", error);
  }
};
