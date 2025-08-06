import express from "express";
import {
  GetAllDosageForms,
  CreateDosageForm,
  DeleteDosageForm,
  GetAllCategories,
  CreateCategory,
  DeleteCategory
} from "../controllers/dosageformsandcategory.js";

const router = express.Router();

// Dosage Forms Routes
router.get("/dosage-forms", GetAllDosageForms);
router.post("/dosage-forms", CreateDosageForm);
router.delete("/dosage-forms/:id", DeleteDosageForm);

// Categories Routes
router.get("/categories", GetAllCategories);
router.post("/categories", CreateCategory);
router.delete("/categories/:id", DeleteCategory);

export default router;
