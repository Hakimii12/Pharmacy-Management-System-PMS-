import { Op, fn, col } from "sequelize";
import Product from "../models/ProductModel.js";
import Category from "../models/categorymodel.js";
import DosageForm from "../models/dosageformsmodel.js";
import { getPagination, paginated } from "../utils/pagination.js";

const REFERENCE_LIST_PAGINATION = { defaultLimit: 100, maxLimit: 200 };

async function listReferenceData(req, res, { Model, productField }) {
  const { page, limit, skip } = getPagination(req.query, REFERENCE_LIST_PAGINATION);

  const { rows: entries, count: total } = await Model.findAndCountAll({
    order: [["name", "ASC"]],
    offset: skip,
    limit,
  });

  const names = entries.map((e) => e.name);
  let usageByName = new Map();
  if (names.length > 0) {
    const usage = await Product.findAll({
      attributes: [productField, [fn("COUNT", col("id")), "count"]],
      where: {
        [productField]: { [Op.in]: names },
        isDeleted: false,
        visibility: { [Op.ne]: "deleted" },
      },
      group: [productField],
      raw: true,
    });
    usageByName = new Map(usage.map((u) => [u[productField], parseInt(u.count, 10)]));
  }

  const data = entries.map((entry) => {
    const json = entry.toJSON();
    return { ...json, productCount: usageByName.get(json.name) || 0 };
  });

  return res.json(paginated(data, { page, limit, total }));
}

export async function GetAllDosageForms(req, res) {
  try {
    return await listReferenceData(req, res, { Model: DosageForm, productField: "DosageForms" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function CreateDosageForm(req, res) {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const existingForm = await DosageForm.findOne({ where: { name } });
    if (existingForm) {
      return res.status(400).json({ message: "Dosage form already exists" });
    }

    const newForm = await DosageForm.create({ name });
    res.status(201).json(newForm);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function DeleteDosageForm(req, res) {
  try {
    const { id } = req.params;
    const dosageForm = await DosageForm.findByPk(id);
    if (!dosageForm) {
      return res.status(404).json({ message: "Dosage form not found" });
    }

    const productCount = await Product.count({
      where: {
        DosageForms: dosageForm.name,
        isDeleted: false,
        visibility: { [Op.ne]: "deleted" },
      },
    });

    if (productCount > 0) {
      return res.status(400).json({
        message: "Cannot delete - dosage form is in use by products",
        productCount,
      });
    }

    await dosageForm.destroy();
    res.json({ message: "Dosage form deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function GetAllCategories(req, res) {
  try {
    return await listReferenceData(req, res, { Model: Category, productField: "category" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function CreateCategory(req, res) {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const existingCategory = await Category.findOne({ where: { name } });
    if (existingCategory) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const newCategory = await Category.create({ name });
    res.status(201).json(newCategory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function DeleteCategory(req, res) {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const productCount = await Product.count({
      where: {
        category: category.name,
        isDeleted: false,
        visibility: { [Op.ne]: "deleted" },
      },
    });

    if (productCount > 0) {
      return res.status(400).json({
        message: "Cannot delete - category is in use by products",
        productCount,
      });
    }

    await category.destroy();
    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}