import Dispensary from "../models/DispensaryModel.js";
import Notification from "../models/NotificationModel.js";
import Product from "../models/ProductModel.js";
export async function GetNotification(req,res){
    try {

         const notification = await Notification.find({});
         if (!notification) {
             return res.status(404).json({ message: 'notification not found' });
         }
         res.json(notification);
    } catch (error) {
        res.status(500).json({ message:error.message})
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
      const lowStockProducts = await Dispensary.find({
        isDeleted: { $ne: true },
        isActive: true,
        $expr: { $lt: ["$quantity", "$threshold"] } // Quantity < threshold
      })
      .populate({
        path: 'product',
        select: 'name brand expiryDate -_id',
        match: { isDeleted: { $ne: true } }
      })
      .select('quantity threshold product -_id')
      .lean();
  
      // Filter out products that might have been deleted but still referenced
      const filteredResults = lowStockProducts.filter(item => item.product !== null);
  
      // Transform to the required format
      const result = filteredResults.map(item => ({
        name: item.product.name,
        brand: item.product.brand,
        expireDate: item.product.expiryDate,
        quantity: item.quantity,
        threshold: item.threshold
      }));
  
      res.status(200).json({
        success: true,
        count: result.length,
        lowStockProducts: result
      });
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
      
      if (isNaN(thresholdDays) || thresholdDays <= 0) {
        return res.status(400).json({
          success: false,
          error: "Invalid days parameter. Must be a positive number"
        });
      }
  
      const today = new Date();
      const thresholdDate = new Date();
      thresholdDate.setDate(today.getDate() + thresholdDays);
  
      const nearExpiryProducts = await Product.aggregate([
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
          $sort: { daysLeft: 1 } // Sort by soonest to expire first
        }
      ]);
  
      res.status(200).json({
        success: true,
        count: nearExpiryProducts.length,
        thresholdDays,
        nearExpiryProducts
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Failed to fetch near-expiry products: ${error.message}`
      });
    }
  };