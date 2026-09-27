import Notification from "../models/NotificationModel.js";

const NEAR_EXPIRY_MONTHS = 3;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export async function syncExpiryNotifications(products) {
  const list = Array.isArray(products) ? products : [products];
  if (list.length === 0) return { modified: 0 };

  const now = startOfToday();
  const nearExpiryCutoff = new Date(now);
  nearExpiryCutoff.setMonth(nearExpiryCutoff.getMonth() + NEAR_EXPIRY_MONTHS);

  for (const product of list) {
    if (!product?.expiryDate) continue;
    const expiry = new Date(product.expiryDate);
    const productId = product.id || product._id;

    if (expiry <= now) {
      const message = `Product ${product.name} has expired!`;
      for (const loc of ["store", "dispensary"]) {
        const [notif, created] = await Notification.findOrCreate({
          where: { productId, type: "Expired", location: loc, read: false },
          defaults: { message, productId, type: "Expired", location: loc, read: false },
        });
        if (!created && notif.message !== message) {
          notif.message = message;
          await notif.save();
        }
      }
      await Notification.destroy({
        where: { productId, type: "NearExpiry", location: "both", read: false },
      });
      continue;
    }

    if (expiry <= nearExpiryCutoff) {
      const daysLeft = Math.ceil((expiry - now) / MS_PER_DAY);
      const message = `Product ${product.name} expires in ${daysLeft} days!`;
      const [notif, created] = await Notification.findOrCreate({
        where: { productId, type: "NearExpiry", location: "both", read: false },
        defaults: { message, productId, type: "NearExpiry", location: "both", read: false },
      });
      if (!created && notif.message !== message) {
        notif.message = message;
        await notif.save();
      }
      continue;
    }

    await Notification.destroy({
      where: { productId, type: "NearExpiry", location: "both", read: false },
    });
  }

  return { modified: list.length };
}

export function syncExpiryNotificationsInBackground(products) {
  Promise.resolve(syncExpiryNotifications(products)).catch((error) => {
    console.error("Expiry notification sync failed:", error);
  });
}
