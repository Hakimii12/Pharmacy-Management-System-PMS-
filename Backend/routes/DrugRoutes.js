import express from "express";
import { CreateProduct ,GetAllProducts,RecordSale} from "../controllers/ProductController.js";

const router =  express.Router();

router.post("/products", CreateProduct);
router.get("/products", GetAllProducts);
router.post("/sales", RecordSale);

export default router