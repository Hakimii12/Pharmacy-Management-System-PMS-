import { Op } from "sequelize";
import Dispensary from "../models/DispensaryModel.js";
import Store from "../models/StoreModel.js";
import Notification from "../models/NotificationModel.js";
import Product from "../models/ProductModel.js";
import { getPagination, paginated } from "../utils/pagination.js";
import { productIdentityKey } from "../utils/productIdentity.js";

export async function GetNotification(req, res) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { type, read } = req.query;

    const where = {};
    if (type) where.type = type;
    if (read === "true" || read === "false") where.read = read === "true";

    const [{ rows: notifications, count: total }, unreadCount] = await Promise.all([
      Notification.findAndCountAll({
        where,
        include: [
          {
            model: Product,
            as: "productDetails",
            attributes: ["id", "name", "brand", "batchNo"],
          },
        ],
        order: [["createdAt", "DESC"]],
        offset: skip,
        limit,
      }),
      Notification.count({ where: { read: false } }),
    ]);

    const mapped = notifications.map((n) => {
      const json = n.toJSON();
      if (json.productDetails) {
        json.product = {
          _id: json.productDetails.id,
          id: json.productDetails.id,
          name: json.productDetails.name,
          brand: json.productDetails.brand,
          batchNo: json.productDetails.batchNo,
        };
      }
      return json;
    });

    res.json({ ...paginated(mapped, { page, limit, total }), unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function GetUnreadCount(req, res) {
  try {
    const unreadCount = await Notification.count({ where: { read: false } });
    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function DeleteNotification(req, res) {
  const id = req.params.id;
  try {
    await Notification.destroy({ where: { id } });
    res.status(200).json({ message: "notification deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function MarkAsRead(req, res) {
  const id = req.params.id;
  try {
    await Notification.update({ read: true }, { where: { id } });
    const notification = await Notification.findByPk(id);
    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function MarkAsReadAll(req, res) {
  try {
    const notification = await Notification.update({ read: true }, { where: { read: false } });
    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export const GetLowStockProducts = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const location = req.query.location === "store" ? "store" : "dispensary";
    const LocationModel = location === "store" ? Store : Dispensary;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows = await LocationModel.findAll({
      where: {
        [Op.or]: [{ isDeleted: false }, { isDeleted: null }, { isDeleted: 0 }],
        isActive: true,
      },
      include: [
        {
          model: Product,
          as: "productDetails",
          where: {
            [Op.or]: [{ isDeleted: false }, { isDeleted: null }, { isDeleted: 0 }],
          },
          attributes: ["id", "name", "brand", "category", "DosageForms", "expiryDate"],
        },
      ],
    });

    // Group sibling batches by identity
    const groupMap = new Map();
    for (const item of rows) {
      const prod = item.productDetails;
      if (!prod) continue;
      const key = productIdentityKey(prod);
      const isExpired = new Date(prod.expiryDate) <= today;
      const usableQty = isExpired ? 0 : (item.quantity || 0);

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          productId: prod.id,
          name: prod.name,
          brand: prod.brand,
          expireDate: prod.expiryDate,
          quantity: 0,
          threshold: item.threshold || 10,
          location,
        });
      }

      const grp = groupMap.get(key);
      grp.quantity += usableQty;
      grp.threshold = Math.max(grp.threshold, item.threshold || 10);
      if (new Date(prod.expiryDate) < new Date(grp.expireDate)) {
        grp.expireDate = prod.expiryDate;
      }
    }

    const lowStockList = Array.from(groupMap.values()).filter(
      (g) => g.quantity <= g.threshold
    );

    lowStockList.sort((a, b) => a.quantity - b.quantity);
    const total = lowStockList.length;
    const paginatedItems = lowStockList.slice(skip, skip + limit);

    res.status(200).json(paginated(paginatedItems, { page, limit, total }));
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to fetch low stock products: ${error.message}`,
    });
  }
};

export const GetNearExpiryProducts = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const thresholdDays = Number(days);
    const { page, limit, skip } = getPagination(req.query);

    if (isNaN(thresholdDays) || thresholdDays <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid days parameter. Must be a positive number",
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thresholdDate = new Date();
    thresholdDate.setDate(today.getDate() + thresholdDays);

    const products = await Product.findAll({
      where: {
        isDeleted: false,
        expiryDate: {
          [Op.gte]: today,
          [Op.lte]: thresholdDate,
        },
      },
      include: [
        {
          model: Dispensary,
          as: "dispensary",
          required: false,
        },
      ],
    });

    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const mapped = products.map((p) => {
      const exp = new Date(p.expiryDate);
      const daysLeft = Math.ceil((exp - today) / MS_PER_DAY);
      const dispQty = p.dispensary ? p.dispensary.quantity : null;
      return {
        productId: p.id,
        _id: p.id,
        name: p.name,
        brand: p.brand,
        expiryDate: p.expiryDate,
        daysLeft,
        quantity: dispQty !== null && dispQty !== undefined ? dispQty : p.quantity,
        batchNo: p.batchNo,
      };
    });

    mapped.sort((a, b) => a.daysLeft - b.daysLeft);
    const total = mapped.length;
    const paginatedItems = mapped.slice(skip, skip + limit);

    res.status(200).json({
      ...paginated(paginatedItems, { page, limit, total }),
      thresholdDays,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to fetch near-expiry products: ${error.message}`,
    });
  }
};