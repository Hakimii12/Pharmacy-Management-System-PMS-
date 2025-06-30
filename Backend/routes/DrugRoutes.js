import express from "express";
import { CreateProduct ,GetAllProducts,RecordSale} from "../controllers/ProductController.js";
import Authenticated from "../middlewares/Authenticated.js";
const router =  express.Router();

router.post("/CreateProducts",Authenticated (), CreateProduct);
router.get("/products", GetAllProducts);
router.post("/sales", RecordSale);

export default router