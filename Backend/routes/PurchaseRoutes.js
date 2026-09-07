import express from "express"
import {
  ListSuppliers,
  CreateSupplier,
  UpdateSupplier,
  DeleteSupplier,
  ListPurchaseOrders,
  GetPurchaseOrder,
  CreatePurchaseOrder,
  UpdatePurchaseOrder,
  PlacePurchaseOrder,
  CancelPurchaseOrder,
  ReceivePurchaseOrder,
  GetReorderSuggestions,
} from "../controllers/PurchaseController.js"
import Authenticated from "../middlewares/Authenticated.js"
import allowedUsers, { MANAGERS } from "../middlewares/Authorization.js"

const router = express.Router()

router.use(Authenticated(), allowedUsers(...MANAGERS))

router.get("/suppliers", ListSuppliers)
router.post("/suppliers", CreateSupplier)
router.put("/suppliers/:id", UpdateSupplier)
router.delete("/suppliers/:id", DeleteSupplier)

router.get("/suggestions", GetReorderSuggestions)

router.get("/orders", ListPurchaseOrders)
router.get("/orders/:id", GetPurchaseOrder)
router.post("/orders", CreatePurchaseOrder)
router.put("/orders/:id", UpdatePurchaseOrder)
router.post("/orders/:id/place", PlacePurchaseOrder)
router.post("/orders/:id/cancel", CancelPurchaseOrder)
router.post("/orders/:id/receive", ReceivePurchaseOrder)

export default router
