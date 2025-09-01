import Product from "../models/ProductModel.js";
import Category from "../models/categorymodel.js";
import DosageForm from "../models/dosageformsmodel.js";
export async function GetAllDosageForms(req, res) {
  try {
    const forms = await DosageForm.find().sort({ name: 1 });
    res.json(forms);
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
    const product = await Product.findOne({ 
      DosageForms: dosageForm.name,
      isDeleted: false,
      visibility: { $ne: "deleted" }
    });
    console.log(product)
    if (product) {
      return res.status(400).json({ 
        message: "Cannot delete - dosage form is in use by products" 
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
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
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
    const product = await Product.findOne({ 
      category: category.name,
      isDeleted: false,
      visibility: { $ne: "deleted" }
    });

    if (product) {
      return res.status(400).json({ 
        message: "Cannot delete - category is in use by products" 
      });
    }

    await Category.findByIdAndDelete(id);
    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}