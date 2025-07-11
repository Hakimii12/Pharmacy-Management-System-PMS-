import express from 'express'
import { DeleteNotification, GetNotification, MarkAsRead, MarkAsReadAll } from '../controllers/Notification.js';
const router = express.Router();
router.get('/notification', GetNotification);
router.put('/notification/:id',MarkAsRead)
router.delete("/removeNotification/:id",DeleteNotification)
router.put("/MarkAsReadAll",MarkAsReadAll)
export default router;