import { Op } from "sequelize";
import Product from "../models/ProductModel.js";
import Notification from "../models/NotificationModel.js";
import { sumLocationStockForIdentity } from "./productIdentity.js";

async function StockChecker(productId) {
  const product = await Product.findByPk(productId);
  if (!product) return;

  const storeStock = await sumLocationStockForIdentity(product, "store");
  const dispStock = await sumLocationStockForIdentity(product, "dispensary");

  const totalUsable = storeStock.usable + dispStock.usable;
  const totalAll = storeStock.total + dispStock.total;

  if (totalUsable <= 0 && totalAll <= 0) {
    const existing = await Notification.findOne({
      where: {
        productId: { [Op.in]: storeStock.siblingIds },
        type: "OutOfStock",
        read: false,
        location: "both",
      },
    });

    if (!existing) {
      await Notification.create({
        type: "OutOfStock",
        message: `Product ${product.name} is completely sold out in both store and dispensary`,
        productId,
        location: "both",
      });
    }
  } else {
    await Notification.destroy({
      where: {
        productId: { [Op.in]: storeStock.siblingIds },
        type: "OutOfStock",
        read: false,
        location: "both",
      },
    });
  }

  if (storeStock.usable <= storeStock.threshold) {
    await Notification.destroy({
      where: {
        productId: { [Op.in]: storeStock.siblingIds },
        type: { [Op.in]: ["LowStock", "OutOfStock"] },
        read: false,
        location: "store",
      },
    });

    if (storeStock.usable <= 0) {
      await Notification.create({
        type: "OutOfStock",
        message: `Product ${product.name} is out of stock in store`,
        productId,
        location: "store",
      });
    } else {
      await Notification.create({
        type: "LowStock",
        message: `Product ${product.name} is low in store. Current: ${storeStock.usable}, Threshold: ${storeStock.threshold}.`,
        productId,
        location: "store",
      });
    }
  } else {
    await Notification.destroy({
      where: {
        productId: { [Op.in]: storeStock.siblingIds },
        type: { [Op.in]: ["LowStock", "OutOfStock"] },
        read: false,
        location: "store",
      },
    });
  }

  if (dispStock.usable <= dispStock.threshold) {
    await Notification.destroy({
      where: {
        productId: { [Op.in]: dispStock.siblingIds },
        type: { [Op.in]: ["LowStock", "OutOfStock"] },
        read: false,
        location: "dispensary",
      },
    });

    if (dispStock.usable <= 0) {
      await Notification.create({
        type: "OutOfStock",
        message: `Product ${product.name} is out of stock in dispensary`,
        productId,
        location: "dispensary",
      });
    } else {
      await Notification.create({
        type: "LowStock",
        message: `Product ${product.name} is low in dispensary. Current: ${dispStock.usable}, Threshold: ${dispStock.threshold}.`,
        productId,
        location: "dispensary",
      });
    }
  } else {
    await Notification.destroy({
      where: {
        productId: { [Op.in]: dispStock.siblingIds },
        type: { [Op.in]: ["LowStock", "OutOfStock"] },
        read: false,
        location: "dispensary",
      },
    });
  }
}

export default StockChecker;