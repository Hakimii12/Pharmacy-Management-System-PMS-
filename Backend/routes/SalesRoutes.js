import express from "express";
import {ConfirmSale,AbortSale,CloseDailyBalance, PrepareAndSaveSale, GetAllPendingStatus} from "../controllers/SalesController.js";
import Authenticated from "../middlewares/Authenticated.js";
const router = express.Router();
router.post("/sales", Authenticated(), PrepareAndSaveSale);
router.get("/sales/pendingStatusItems",Authenticated(),GetAllPendingStatus);
router.post("/sales/confirm/:transactionId", Authenticated(), ConfirmSale);
// Abort prepared sale
router.post("/sales/abort/:transactionId", Authenticated(), AbortSale);

// Close daily balance
router.post("/sales/close-balance", Authenticated(), CloseDailyBalance);

export default router;