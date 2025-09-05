import express from "express";
import {ConfirmSale,AbortSale,CloseDailyBalance, PrepareAndSaveSale, GetAllPendingStatus, GetAbortAndComplatedSale, GetRecentSales, GetTotalSales, GetDailyTransactions, GetAllCashiers, GetDailyBalanceHistory, UndoSale} from "../controllers/SalesController.js";
import Authenticated from "../middlewares/Authenticated.js";
const router = express.Router();
router.post("/prepareAndSaveSale", Authenticated(), PrepareAndSaveSale);
router.get("/pendingStatusItems",Authenticated(),GetAllPendingStatus);
router.get("/allTransactionHistory",Authenticated(),GetAbortAndComplatedSale);
router.post("/confirm/:transactionId", Authenticated(), ConfirmSale);
// Abort prepared sale
router.post("/abort/:transactionId", Authenticated(), AbortSale);

//get selles
router.get("/getRecentSales",Authenticated(),GetRecentSales)
router.get("/getTotalSales",Authenticated(),GetTotalSales)
// New daily balance routes
router.post("/close-daily-balance", Authenticated(), CloseDailyBalance)
router.get("/daily/:cashierId", Authenticated(), GetDailyTransactions)
router.get("/cashiers", Authenticated(), GetAllCashiers)
router.get("/daily-balance-history", Authenticated(), GetDailyBalanceHistory)
router.post("/undo", Authenticated(), UndoSale)
export default router;