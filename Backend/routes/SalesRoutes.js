import express from "express";
import {ConfirmSale,AbortSale,CloseDailyBalance, PrepareAndSaveSale, GetAllPendingStatus, GetAbortAndComplatedSale, GetRecentSales, GetTotalSales, GetDailyTransactions, GetAllCashiers, GetDailyBalanceHistory} from "../controllers/SalesController.js";
import Authenticated from "../middlewares/Authenticated.js";
const router = express.Router();
router.post("/sales", Authenticated(), PrepareAndSaveSale);
router.get("/sales/pendingStatusItems",Authenticated(),GetAllPendingStatus);
router.get("/sales/allTransactionHistory",Authenticated(),GetAbortAndComplatedSale);
router.post("/sales/confirm/:transactionId", Authenticated(), ConfirmSale);
// Abort prepared sale
router.post("/sales/abort/:transactionId", Authenticated(), AbortSale);

//get selles
router.get("/sales/getRecentSales",Authenticated(),GetRecentSales)
router.get("/sales/getTotalSales",Authenticated(),GetTotalSales)
// New daily balance routes
router.post("/close-daily-balance", Authenticated(), CloseDailyBalance)
router.get("/daily/:cashierId", Authenticated(), GetDailyTransactions)
router.get("/cashiers", Authenticated(), GetAllCashiers)
router.get("/daily-balance-history", Authenticated(), GetDailyBalanceHistory)
export default router;