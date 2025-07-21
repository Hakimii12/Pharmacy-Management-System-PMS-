import express from 'express'
import { GetProfit } from '../controllers/ProfitController.js';
const router = express.Router();
router.get('/profit', GetProfit);
export default router;