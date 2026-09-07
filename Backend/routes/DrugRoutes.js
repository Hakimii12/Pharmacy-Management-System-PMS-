import express from "express";
import { CreateProduct,
  IssueToDispensary,
  ReturnToStore,
  GetAllProducts,
  GetGroupedProducts,
  GetGroupedStoreProducts,
  GetGroupedDispensaryProducts,
  GetGroupedSellableProducts,
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
  UpdateStoreQuantity,
  BulkImportProducts,
  GetDispensaryProductToSell} from "../controllers/ProductController.js";
import Authenticated from "../middlewares/Authenticated.js";
import allowedUsers, { MANAGERS } from "../middlewares/Authorization.js";

const router =  express.Router();

// Reads are available to any approved account — the dashboard, reports and the POS
// product picker all need them.
router.get("/allProducts", Authenticated(), GetAllProducts);
router.get("/groupedProducts", Authenticated(), GetGroupedProducts);
router.get("/groupedStoreProducts", Authenticated(), GetGroupedStoreProducts);
router.get("/groupedDispensaryProducts", Authenticated(), GetGroupedDispensaryProducts);
router.get("/groupedSellableProducts", Authenticated(), GetGroupedSellableProducts);
router.get("/storeProducts", Authenticated(), GetStoreProduct);
router.get("/dispensaryProducts", Authenticated(), GetDispensaryProduct);
router.get("/dispensaryProductsToSell", Authenticated(), GetDispensaryProductToSell);
router.get("/productToDispensary", Authenticated(), GetIssuedDispensary);
router.get("/getRetrunToStore", Authenticated(), GetReturnToStore);
router.get("/getCountedStore", Authenticated(), GetCountedStore);
router.get("/getCountedDispensary", Authenticated(), GetCountedDispensary);
router.get("/getCountAllProduct", Authenticated(), CountAllProduct);

// Anything that mutates stock or the catalog is restricted to managers.
router.post("/CreateProducts", Authenticated(), allowedUsers(...MANAGERS), CreateProduct);
router.post("/createProductInDispensary", Authenticated(), allowedUsers(...MANAGERS), CreateProductInDispensary);
router.post("/bulkImport", Authenticated(), allowedUsers(...MANAGERS), BulkImportProducts);
router.put("/update/:id", Authenticated(), allowedUsers(...MANAGERS), UpdateProduct);
router.put("/updateDispensaryQuantity/:id", Authenticated(), allowedUsers(...MANAGERS), UpdateDispensaryQuantity);
router.put("/updateStoreQuantity/:id", Authenticated(), allowedUsers(...MANAGERS), UpdateStoreQuantity);
router.post("/issueToDispensary", Authenticated(), allowedUsers(...MANAGERS), IssueToDispensary);
router.post("/returnToStore", Authenticated(), allowedUsers(...MANAGERS), ReturnToStore);
router.delete("/smartDelete/:id", Authenticated(), allowedUsers(...MANAGERS), SmartDeleteProduct);
router.delete("/dispensary/:id", Authenticated(), allowedUsers(...MANAGERS), DeleteFromDispensary);

export default router
