import { Op, fn, col, where } from "sequelize";
import Product from "../models/ProductModel.js";
import Store from "../models/StoreModel.js";
import Dispensary from "../models/DispensaryModel.js";

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function normalizeIdentityPart(value, fallback = "") {
  return String(value ?? fallback).trim().toLowerCase();
}

export function productIdentityKey(product) {
  return [
    normalizeIdentityPart(product.name),
    normalizeIdentityPart(product.brand, "no_brand"),
  ].join("|");
}

/**
 * All non-deleted product batches that share the same catalogue identity.
 */
export async function findSiblingProducts(productDoc) {
  const name = normalizeIdentityPart(productDoc.name);
  const brand = normalizeIdentityPart(productDoc.brand, "no_brand");

  return Product.findAll({
    where: {
      [Op.or]: [{ isDeleted: false }, { isDeleted: null }, { isDeleted: 0 }],
      [Op.and]: [
        where(fn("LOWER", fn("TRIM", fn("COALESCE", col("name"), ""))), name),
        where(fn("LOWER", fn("TRIM", fn("COALESCE", col("brand"), "no_brand"))), brand),
      ],
    },
    attributes: ["id", "name", "expiryDate"],
    raw: true,
  });
}

/**
 * Combined on-hand stock for one product identity at store or dispensary.
 */
export async function sumLocationStockForIdentity(productDoc, location) {
  const siblings = await findSiblingProducts(productDoc);
  const siblingIds = siblings.map((row) => row.id);
  const Model = location === "store" ? Store : Dispensary;
  const today = startOfToday();
  const expiryById = new Map(siblings.map((row) => [String(row.id), row.expiryDate]));

  if (siblingIds.length === 0) {
    return {
      total: 0,
      usable: 0,
      threshold: 10,
      siblingIds: [],
      name: productDoc.name,
    };
  }

  const rows = await Model.findAll({
    where: {
      productId: { [Op.in]: siblingIds },
      [Op.or]: [{ isDeleted: false }, { isDeleted: null }, { isDeleted: 0 }],
      isActive: true,
    },
    raw: true,
  });

  let total = 0;
  let usable = 0;
  let threshold = 0;

  for (const row of rows) {
    const qty = row.quantity || 0;
    total += qty;
    threshold = Math.max(threshold, row.threshold ?? 10);
    const expiry = expiryById.get(String(row.productId));
    const expired = expiry ? new Date(expiry) <= today : false;
    if (!expired) usable += qty;
  }

  return {
    total,
    usable,
    threshold: threshold || 10,
    siblingIds,
    name: productDoc.name,
  };
}
