import express from "express";
import { CreateProduct,
  IssueToDispensary,
  ReturnToStore,
  GetProductHistory,
  GetAllProducts,
  GetDispensaryProduct,
  GetStoreProduct} from "../controllers/ProductController.js";
import Authenticated from "../middlewares/Authenticated.js";
const router =  express.Router();
router.get("/allProducts", Authenticated(), GetAllProducts);
router.post("/CreateProducts",Authenticated (), CreateProduct);
router.post("/issueToDispensary",Authenticated(),IssueToDispensary);
router.post("/returnToStore", Authenticated(), ReturnToStore);
router.get("/productHistory/:productId", Authenticated(), GetProductHistory);
router.get("/storeProducts", Authenticated(), GetStoreProduct);
router.get("/dispensaryProducts", Authenticated(), GetDispensaryProduct);

export default router