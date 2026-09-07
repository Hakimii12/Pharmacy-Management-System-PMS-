import Dispensary from "../models/DispensaryModel.js";
import Store from "../models/StoreModel.js";
import Notification from "../models/NotificationModel.js";
import Product from "../models/ProductModel.js";
import { getPagination, paginated } from "../utils/pagination.js";

export async function GetNotification(req,res){
    try {
         const { page, limit, skip } = getPagination(req.query);
         const { type, read } = req.query;

         const query = {};
         if (type) query.type = type;
         if (read === "true" || read === "false") query.read = read === "true";

         const [notifications, total, unreadCount] = await Promise.all([
           Notification.find(query)
             .populate('product', 'name brand batchNo')
             .sort({ createdAt: -1 })
             .skip(skip)
             .limit(limit)
             .lean(),
           Notification.countDocuments(query),
           Notification.countDocuments({ read: false }),
         ]);

         res.json({ ...paginated(notifications, { page, limit, total }), unreadCount });
    } catch (error) {
        res.status(500).json({ message:error.message})
    }
}

/** Unread count only — cheap enough to poll for the nav badge. */
export async function GetUnreadCount(req, res) {
    try {
        const unreadCount = await Notification.countDocuments({ read: false });
        res.json({ unreadCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
export async function DeleteNotification(req,res){
    const id = req.params.id;
    try {
        await Notification.findByIdAndDelete(id);
        res.status(200).json({message: "notification deleted"})
    } catch (error) {
        res.status(500).json({message:error.message})
    }
}
export async function MarkAsRead(req,res){
    const id = req.params.id
    try {
        const notification = await Notification.findByIdAndUpdate( id,{read:true} ,{new:true})
        res.status(200).json(notification)
    } catch (error) {
        res.status(500).json({message:error.message})
    }
}
export async function MarkAsReadAll(req,res){
    try {
        const notification = await Notification.updateMany({read:false},{read:true})
        res.status(200).json(notification)
    } catch (error) {
        res.status(500).json({message:error.message})
    }
}
export const GetLowStockProducts = async (req, res) => {
    try {
      const { page, limit, skip } = getPagination(req.query);
      const location = req.query.location === "store" ? "store" : "dispensary";
      const LocationModel = location === "store" ? Store : Dispensary;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Group sibling batches first, then decide low stock from the combined usable qty.
      const [result] = await LocationModel.aggregate([
        {
          $match: {
            isDeleted: { $ne: true },
            isActive: true,
            quantity: { $gt: 0 },
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "product",
            foreignField: "_id",
            as: "product",
            pipeline: [
              { $match: { isDeleted: { $ne: true } } },
              {
                $project: {
                  name: 1,
                  brand: 1,
                  category: 1,
                  DosageForms: 1,
                  expiryDate: 1,
                },
              },
            ],
          },
        },
        { $unwind: "$product" },
        {
          $addFields: {
            _identity: {
              name: { $toLower: { $trim: { input: { $ifNull: ["$product.name", ""] } } } },
              brand: { $toLower: { $trim: { input: { $ifNull: ["$product.brand", "no_brand"] } } } },
              category: { $toLower: { $trim: { input: { $ifNull: ["$product.category", ""] } } } },
              DosageForms: { $toLower: { $trim: { input: { $ifNull: ["$product.DosageForms", ""] } } } },
            },
            usableQty: {
              $cond: [{ $lte: ["$product.expiryDate", today] }, 0, "$quantity"],
            },
          },
        },
        {
          $group: {
            _id: "$_identity",
            productId: { $first: "$product._id" },
            name: { $first: "$product.name" },
            brand: { $first: "$product.brand" },
            expireDate: { $min: "$product.expiryDate" },
            quantity: { $sum: "$usableQty" },
            threshold: { $max: "$threshold" },
          },
        },
        {
          $match: {
            quantity: { $gt: 0 },
            $expr: { $lte: ["$quantity", "$threshold"] },
          },
        },
        {
          $project: {
            _id: 0,
            productId: 1,
            name: 1,
            brand: 1,
            expireDate: 1,
            quantity: 1,
            threshold: 1,
            location: location,
          },
        },
        {
          $facet: {
            data: [{ $sort: { quantity: 1 } }, { $skip: skip }, { $limit: limit }],
            meta: [{ $count: "total" }],
          },
        },
      ]);

      res.status(200).json(
        paginated(result?.data || [], { page, limit, total: result?.meta?.[0]?.total || 0 }),
      );
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Failed to fetch low stock products: ${error.message}`
      });
    }
  };
export const GetNearExpiryProducts = async (req, res) => {
    try {
      const { days = 30 } = req.query; // Default 30 days threshold
      const thresholdDays = Number(days);
      const { page, limit, skip } = getPagination(req.query);
      
      if (isNaN(thresholdDays) || thresholdDays <= 0) {
        return res.status(400).json({
          success: false,
          error: "Invalid days parameter. Must be a positive number"
        });
      }
  
      const today = new Date();
      const thresholdDate = new Date();
      thresholdDate.setDate(today.getDate() + thresholdDays);
  
      const [result] = await Product.aggregate([
        {
          $match: {
            isDeleted: { $ne: true },
            expiryDate: { 
              $gte: today, 
              $lte: thresholdDate 
            }
          }
        },
        {
          $lookup: {
            from: "dispensaries",
            localField: "_id",
            foreignField: "product",
            as: "dispensary"
          }
        },
        {
          $unwind: {
            path: "$dispensary",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $addFields: {
            daysLeft: {
              $ceil: {
                $divide: [
                  { $subtract: ["$expiryDate", today] },
                  1000 * 60 * 60 * 24 // ms in a day
                ]
              }
            },
            dispensaryQuantity: "$dispensary.quantity"
          }
        },
        {
          $project: {
            _id: 0,
            productId: "$_id",
            name: 1,
            brand: 1,
            expiryDate: 1,
            daysLeft: 1,
            quantity: {
              $ifNull: ["$dispensaryQuantity", "$quantity"]
            },
            batchNo: 1
          }
        },
        {
          $facet: {
            // Soonest to expire first
            data: [{ $sort: { daysLeft: 1 } }, { $skip: skip }, { $limit: limit }],
            meta: [{ $count: "total" }],
          },
        },
      ]);
  
      res.status(200).json({
        ...paginated(result?.data || [], { page, limit, total: result?.meta?.[0]?.total || 0 }),
        thresholdDays,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Failed to fetch near-expiry products: ${error.message}`
      });
    }
  };