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
  DeleteFromDispensary,
  SmartDeleteProduct,
  CountAllProduct,
  CreateProductInDispensary,
  UpdateDispensaryQuantity,
  UpdateStoreQuantity} from "../controllers/ProductController.js";
import Authenticated from "../middlewares/Authenticated.js";
const router =  express.Router();
router.get("/allProducts", Authenticated(), GetAllProducts);
router.post("/CreateProducts",Authenticated (), CreateProduct);
router.post("/createProductInDispensary",Authenticated (), CreateProductInDispensary);
router.put("/update/:id",Authenticated (),UpdateProduct)
router.post("/issueToDispensary",Authenticated(),IssueToDispensary);
router.post("/returnToStore", Authenticated(), ReturnToStore);
router.delete("/smartDelete/:id", Authenticated(), SmartDeleteProduct)
router.delete("/dispensary/:id", Authenticated(), DeleteFromDispensary)
router.get("/productToDispensary", Authenticated(), GetIssuedDispensary);
router.get("/getRetrunToStore", Authenticated(), GetReturnToStore);
router.get("/storeProducts", Authenticated(), GetStoreProduct);
router.get("/dispensaryProducts", Authenticated(), GetDispensaryProduct);
router.get("/getCountedStore",Authenticated(),GetCountedStore)
router.get("/getCountedDispensary",Authenticated(),GetCountedDispensary)
router.get("/getCountAllProduct",Authenticated(),CountAllProduct);
router.put("/updateDispensaryQuantity/:id", Authenticated(), UpdateDispensaryQuantity);
router.put("/updateStoreQuantity/:id", Authenticated(), UpdateStoreQuantity);
export default router