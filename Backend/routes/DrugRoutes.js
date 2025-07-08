import express from "express";
import { CreateProduct,
  IssueToDispensary,
  ReturnToStore,
  GetAllProducts,
  GetDispensaryProduct,
  GetStoreProduct,
  GetIssuedDispensary,
  GetCountedStore} from "../controllers/ProductController.js";
import Authenticated from "../middlewares/Authenticated.js";
const router =  express.Router();
router.get("/allProducts", Authenticated(), GetAllProducts);
router.post("/CreateProducts",Authenticated (), CreateProduct);
router.post("/issueToDispensary",Authenticated(),IssueToDispensary);
router.post("/returnToStore", Authenticated(), ReturnToStore);
router.get("/productToDispensary", Authenticated(), GetIssuedDispensary);
router.get("/storeProducts", Authenticated(), GetStoreProduct);
router.get("/dispensaryProducts", Authenticated(), GetDispensaryProduct);
router.get("/getCountedStore",Authenticated(),GetCountedStore)

export default router