import Product from "../models/ProductModel.js";
import Category from "../models/categorymodel.js";
import DosageForm from "../models/dosageformsmodel.js";
import { getPagination, paginated } from "../utils/pagination.js";

/**
 * These two collections back form dropdowns, so they get a larger cap than the
 * 25/100 default — but they are still bounded.
 */
const REFERENCE_LIST_PAGINATION = { defaultLimit: 100, maxLimit: 200 };

/**
 * Reads a reference list along with how many live products use each entry, so the
 * UI can disable the delete action without a request per row.
 */
async function listReferenceData(req, res, { Model, productField }) {
  const { page, limit, skip } = getPagination(req.query, REFERENCE_LIST_PAGINATION);

  const [entries, total] = await Promise.all([
    Model.find().sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Model.countDocuments(),
  ]);

  const usage = await Product.aggregate([
    { $match: { [productField]: { $in: entries.map((e) => e.name) }, isDeleted: false, visibility: { $ne: "deleted" } } },
    { $group: { _id: `$${productField}`, count: { $sum: 1 } } },
  ]);
  const usageByName = new Map(usage.map((u) => [u._id, u.count]));

  const data = entries.map((entry) => ({ ...entry, productCount: usageByName.get(entry.name) || 0 }));
  return res.json(paginated(data, { page, limit, total }));
}

export async function GetAllDosageForms(req, res) {
  try {
    return await listReferenceData(req, res, { Model: DosageForm, productField: "DosageForms" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Create new dosage form
export async function CreateDosageForm(req, res) {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    // Check if already exists
    const existingForm = await DosageForm.findOne({ name });
    if (existingForm) {
      return res.status(400).json({ message: "Dosage form already exists" });
    }

    const newForm = new DosageForm({ name });
    await newForm.save();
    res.status(201).json(newForm);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Delete dosage form
export async function DeleteDosageForm(req, res) {
  try {
    const { id } = req.params;
    
    // Get dosage form name
    const dosageForm = await DosageForm.findById(id);
    if (!dosageForm) {
      return res.status(404).json({ message: "Dosage form not found" });
    }

    // Check products by NAME (not ID)
    const productCount = await Product.countDocuments({
      DosageForms: dosageForm.name,
      isDeleted: false,
      visibility: { $ne: "deleted" }
    });
    if (productCount > 0) {
      return res.status(400).json({ 
        message: "Cannot delete - dosage form is in use by products",
        productCount,
      });
    }

    await DosageForm.findByIdAndDelete(id);
    res.json({ message: "Dosage form deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// ==================== CATEGORIES ==================== //

// Get all categories
export async function GetAllCategories(req, res) {
  try {
    return await listReferenceData(req, res, { Model: Category, productField: "category" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Create new category
export async function CreateCategory(req, res) {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    // Check if already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const newCategory = new Category({ name });
    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Delete category
export async function DeleteCategory(req, res) {
  try {
    const { id } = req.params;
    
    // Get category name
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Check products by NAME (not ID)
    const productCount = await Product.countDocuments({
      category: category.name,
      isDeleted: false,
      visibility: { $ne: "deleted" }
    });

    if (productCount > 0) {
      return res.status(400).json({ 
        message: "Cannot delete - category is in use by products",
        productCount,
      });
    }

    await Category.findByIdAndDelete(id);
    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}