import express from "express";
import { CreateProduct,
  IssueToDispensary,
  ReturnToStore,
  GetProductHistory} from "../controllers/ProductController.js";
import Authenticated from "../middlewares/Authenticated.js";
const router =  express.Router();

router.post("/CreateProducts",Authenticated (), CreateProduct);
router.post("/issueToDispensary",Authenticated(),IssueToDispensary);
router.post("/returnToStore", Authenticated(), ReturnToStore);
router.get("/productHistory/:productId", Authenticated(), GetProductHistory);

export default router