import express from "express"
import {
  GetProductInventory,
  CalculateDispensaryInventory,
  GetDispensaryLedger,
  ReconcileInventory,
  SubmitPhysicalReconciliation,
  GetInventoryHistory,
  GetDispensarySummary,
} from "../controllers/InventoryController.js"
import Authenticated from "../middlewares/Authenticated.js"
import allowedUsers, { MANAGERS } from "../middlewares/Authorization.js"

const router = express.Router()

// Inventory snapshot for one product
router.get("/product/:id", Authenticated(), GetProductInventory)

// Period reconciliation ledger for one product
router.get("/calculate/:id", Authenticated(), CalculateDispensaryInventory)

// Period reconciliation ledger for all dispensary products
router.get("/dispensary-ledger", Authenticated(), GetDispensaryLedger)

// Stock movement history
router.get("/history/:id", Authenticated(), GetInventoryHistory)

// Dispensary valuation report
router.get("/getDispensarySummary", Authenticated(), GetDispensarySummary)

// Manual stock adjustment
router.post("/reconcile/:id", Authenticated(), allowedUsers(...MANAGERS), ReconcileInventory)

// Bulk physical count reconciliation & settlement
router.post("/submit-physical-reconciliation", Authenticated(), allowedUsers(...MANAGERS), SubmitPhysicalReconciliation)

export default router
