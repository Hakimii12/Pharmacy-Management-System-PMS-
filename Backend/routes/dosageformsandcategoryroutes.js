import express from "express";
import {
  GetAllDosageForms,
  CreateDosageForm,
  DeleteDosageForm,
  GetAllCategories,
  CreateCategory,
  DeleteCategory
} from "../controllers/dosageformsandcategory.js";
import Authenticated from "../middlewares/Authenticated.js";
import allowedUsers, { MANAGERS } from "../middlewares/Authorization.js";

const router = express.Router();

// Reads populate form dropdowns for every role; writes are catalog administration.
router.get("/dosage-forms", Authenticated(), GetAllDosageForms);
router.post("/dosage-forms", Authenticated(), allowedUsers(...MANAGERS), CreateDosageForm);
router.delete("/dosage-forms/:id", Authenticated(), allowedUsers(...MANAGERS), DeleteDosageForm);

router.get("/categories", Authenticated(), GetAllCategories);
router.post("/categories", Authenticated(), allowedUsers(...MANAGERS), CreateCategory);
router.delete("/categories/:id", Authenticated(), allowedUsers(...MANAGERS), DeleteCategory);

export default router;
