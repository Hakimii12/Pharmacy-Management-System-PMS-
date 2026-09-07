import express from "express"
import {
  GetProductInventory,
  CalculateDispensaryInventory,
  ReconcileInventory,
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

// Stock movement history
router.get("/history/:id", Authenticated(), GetInventoryHistory)

// Dispensary valuation report
router.get("/getDispensarySummary", Authenticated(), GetDispensarySummary)

// Manual stock adjustment. This was mounted as GET while reading `req.body`,
// which meant it could never receive an adjustment.
router.post("/reconcile/:id", Authenticated(), allowedUsers(...MANAGERS), ReconcileInventory)

export default router
