import express from "express";
import { CreateProduct,
  IssueToDispensary,
  ReturnToStore,
  GetAllProducts,
  GetDispensaryProduct,
  GetStoreProduct,
  GetIssuedDispensary,
  GetCountedStore,
  GetReturnToStore,
  GetCountedDispensary,
  UpdateProduct,
  RemoveFromTheShelf} from "../controllers/ProductController.js";
import Authenticated from "../middlewares/Authenticated.js";
const router =  express.Router();
router.get("/allProducts", Authenticated(), GetAllProducts);
router.post("/CreateProducts",Authenticated (), CreateProduct);
router.put("/update/:id",Authenticated (),UpdateProduct)
router.post("/issueToDispensary",Authenticated(),IssueToDispensary);
router.post("/returnToStore", Authenticated(), ReturnToStore);
router.post("/removeFromTheShelf/:id", Authenticated(), RemoveFromTheShelf);
router.get("/productToDispensary", Authenticated(), GetIssuedDispensary);
router.get("/getRetrunToStore", Authenticated(), GetReturnToStore);
router.get("/storeProducts", Authenticated(), GetStoreProduct);
router.get("/dispensaryProducts", Authenticated(), GetDispensaryProduct);
router.get("/getCountedStore",Authenticated(),GetCountedStore)
router.get("/getCountedDispensary",Authenticated(),GetCountedDispensary)
export default router