import express from 'express'
import { GetProfit } from '../controllers/ProfitController.js';
import Authenticated from '../middlewares/Authenticated.js';
import allowedUsers, { MANAGERS } from '../middlewares/Authorization.js';

const router = express.Router();

// Profit figures are management data — previously readable without a session.
router.get('/profit', Authenticated(), allowedUsers(...MANAGERS), GetProfit);

export default router;
