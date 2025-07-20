import express from 'express'
import { DeleteNotification, GetLowStockProducts, GetNearExpiryProducts, GetNotification, MarkAsRead, MarkAsReadAll } from '../controllers/Notification.js';
const router = express.Router();
router.get('/notification', GetNotification);
router.put('/notification/:id',MarkAsRead)
router.delete("/removeNotification/:id",DeleteNotification)
router.put("/MarkAsReadAll",MarkAsReadAll)
router.get("/getLowStock",GetLowStockProducts)
router.get("/getNearExpiryProducts",GetNearExpiryProducts)
export default router;