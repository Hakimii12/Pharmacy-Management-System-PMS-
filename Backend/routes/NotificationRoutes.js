import express from 'express'
import {
  DeleteNotification,
  GetLowStockProducts,
  GetNearExpiryProducts,
  GetNotification,
  GetUnreadCount,
  MarkAsRead,
  MarkAsReadAll,
} from '../controllers/Notification.js';
import Authenticated from '../middlewares/Authenticated.js';
import allowedUsers, { MANAGERS } from '../middlewares/Authorization.js';

const router = express.Router();

// These endpoints were previously unauthenticated, exposing the full stock
// position and expiry schedule of the pharmacy to anyone who could reach the API.
router.get('/notification', Authenticated(), GetNotification);
router.get('/unreadCount', Authenticated(), GetUnreadCount);
router.put('/notification/:id', Authenticated(), MarkAsRead);
router.put('/MarkAsReadAll', Authenticated(), MarkAsReadAll);
router.delete('/removeNotification/:id', Authenticated(), allowedUsers(...MANAGERS), DeleteNotification);
router.get('/getLowStock', Authenticated(), GetLowStockProducts);
router.get('/getNearExpiryProducts', Authenticated(), GetNearExpiryProducts);

export default router;
