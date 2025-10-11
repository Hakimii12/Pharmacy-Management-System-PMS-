import express from "express";
import {
  ConfirmSale,
  AbortSale,
  CloseDailyBalance, 
  PrepareAndSaveSale,
  GetAllPendingStatus,
  GetAbortAndComplatedSale,
  GetRecentSales,
  GetTotalSales,
  GetDailyTransactions,
  GetAllCashiers,
  GetDailyBalanceHistory,
  UndoSale,
  CreateCreditSale,        // Add this
  ProcessCreditPayment,    // Add this
  GetCreditSales          // Add this
} from "../controllers/SalesController.js";
import Authenticated from "../middlewares/Authenticated.js";

const router = express.Router();

// Existing routes...
router.post("/prepareAndSaveSale", Authenticated(), PrepareAndSaveSale);
router.get("/pendingStatusItems", Authenticated(), GetAllPendingStatus);
router.get("/allTransactionHistory", Authenticated(), GetAbortAndComplatedSale);
router.post("/confirm/:transactionId", Authenticated(), ConfirmSale);
router.post("/abort/:transactionId", Authenticated(), AbortSale);

// Credit sale routes
router.post("/create-credit-sale", Authenticated(), CreateCreditSale);
router.post("/process-credit-payment", Authenticated(), ProcessCreditPayment);
router.get("/credit-sales", Authenticated(), GetCreditSales);

// Other existing routes...
router.get("/getRecentSales", Authenticated(), GetRecentSales);
router.get("/getTotalSales", Authenticated(), GetTotalSales);
router.post("/close-daily-balance", Authenticated(), CloseDailyBalance);
router.get("/daily/:cashierId", Authenticated(), GetDailyTransactions);
router.get("/cashiers", Authenticated(), GetAllCashiers);
router.get("/daily-balance-history", Authenticated(), GetDailyBalanceHistory);
router.post("/undo", Authenticated(), UndoSale);

export default router;