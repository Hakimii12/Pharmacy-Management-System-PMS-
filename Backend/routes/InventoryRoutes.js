import express from "express"
import {
  GetProductInventory,
  CalculateDispensaryInventory,
  ReconcileInventory,
  GetInventoryHistory,
  GetDispensarySummary,
} from "../controllers/InventoryController.js"
import Authenticated from "../middlewares/Authenticated.js"

const router = express.Router()

// Get comprehensive inventory report
router.get("/product/:id", Authenticated(), GetProductInventory)

// Get stock movement history for a specific product
router.get("/calculate/:id", Authenticated(), CalculateDispensaryInventory)

// Get daily inventory reconciliation
router.get("/reconcile/:id", Authenticated(), ReconcileInventory)

// Get inventory valuation report
router.get("/history/:id", Authenticated(), GetInventoryHistory)
router.get("/getDispensarySummary", Authenticated(), GetDispensarySummary)
export default router
