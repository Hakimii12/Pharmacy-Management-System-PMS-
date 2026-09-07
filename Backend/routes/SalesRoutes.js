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
  CreateCreditSale,
  ProcessCreditPayment,
  GetCreditSales
} from "../controllers/SalesController.js";
import Authenticated from "../middlewares/Authenticated.js";
import allowedUsers, { MANAGERS, SELLERS, CASHIERS } from "../middlewares/Authorization.js";

const router = express.Router();

// Ringing up a sale — pharmacist (or a manager covering the counter).
router.post("/prepareAndSaveSale", Authenticated(), allowedUsers(...SELLERS), PrepareAndSaveSale);
router.post("/create-credit-sale", Authenticated(), allowedUsers(...SELLERS), CreateCreditSale);

// Taking payment on a prepared order — cashier.
router.get("/pendingStatusItems", Authenticated(), allowedUsers(...CASHIERS, "pharmacist"), GetAllPendingStatus);
router.post("/confirm/:transactionId", Authenticated(), allowedUsers(...CASHIERS), ConfirmSale);
router.post("/abort/:transactionId", Authenticated(), allowedUsers(...CASHIERS), AbortSale);

// Credit ledger administration.
router.get("/credit-sales", Authenticated(), allowedUsers(...MANAGERS), GetCreditSales);
router.post("/process-credit-payment", Authenticated(), allowedUsers(...MANAGERS, "cashier"), ProcessCreditPayment);
router.post("/undo", Authenticated(), allowedUsers(...MANAGERS), UndoSale);

// Reporting — readable by any approved account.
router.get("/allTransactionHistory", Authenticated(), GetAbortAndComplatedSale);
router.get("/getRecentSales", Authenticated(), GetRecentSales);
router.get("/getTotalSales", Authenticated(), GetTotalSales);

// Daily balance / cash reconciliation.
router.post("/close-daily-balance", Authenticated(), allowedUsers(...MANAGERS), CloseDailyBalance);
router.get("/daily/:cashierId", Authenticated(), GetDailyTransactions);
router.get("/cashiers", Authenticated(), allowedUsers(...MANAGERS), GetAllCashiers);
router.get("/daily-balance-history", Authenticated(), allowedUsers(...MANAGERS), GetDailyBalanceHistory);

export default router;
