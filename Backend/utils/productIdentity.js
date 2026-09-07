import mongoose from "mongoose"

/**
 * Product identity = name + brand + category + dosage form (case-insensitive).
 * Several batches share one identity; stock alerts must use the combined total.
 */

function startOfToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

export function normalizeIdentityPart(value, fallback = "") {
  return String(value ?? fallback).trim().toLowerCase()
}

export function productIdentityKey(product) {
  return [
    normalizeIdentityPart(product.name),
    normalizeIdentityPart(product.brand, "no_brand"),
    normalizeIdentityPart(product.category),
    normalizeIdentityPart(product.DosageForms),
  ].join("|")
}

/** Aggregation stages that attach a stable `_identity` field for grouping. */
export const IDENTITY_ADD_FIELDS = {
  $addFields: {
    _identity: {
      name: { $toLower: { $trim: { input: { $ifNull: ["$name", ""] } } } },
      brand: { $toLower: { $trim: { input: { $ifNull: ["$brand", "no_brand"] } } } },
      category: { $toLower: { $trim: { input: { $ifNull: ["$category", ""] } } } },
      DosageForms: { $toLower: { $trim: { input: { $ifNull: ["$DosageForms", ""] } } } },
    },
  },
}

/**
 * All non-deleted product batches that share the same catalogue identity.
 */
export async function findSiblingProducts(productDoc) {
  const Product = mongoose.model("Product")
  const key = {
    name: normalizeIdentityPart(productDoc.name),
    brand: normalizeIdentityPart(productDoc.brand, "no_brand"),
    category: normalizeIdentityPart(productDoc.category),
    DosageForms: normalizeIdentityPart(productDoc.DosageForms),
  }

  return Product.aggregate([
    { $match: { isDeleted: { $ne: true } } },
    IDENTITY_ADD_FIELDS,
    {
      $match: {
        "_identity.name": key.name,
        "_identity.brand": key.brand,
        "_identity.category": key.category,
        "_identity.DosageForms": key.DosageForms,
      },
    },
    { $project: { _id: 1, name: 1, expiryDate: 1 } },
  ])
}

/**
 * Combined on-hand stock for one product identity at store or dispensary.
 * `usable` excludes expired lots so a dead batch cannot trigger LowStock alone.
 */
export async function sumLocationStockForIdentity(productDoc, location) {
  const siblings = await findSiblingProducts(productDoc)
  const siblingIds = siblings.map((row) => row._id)
  // Resolve lazily to avoid a circular import with Store/Dispensary models.
  const Model = mongoose.model(location === "store" ? "Store" : "Dispensary")
  const today = startOfToday()
  const expiryById = new Map(siblings.map((row) => [String(row._id), row.expiryDate]))

  if (siblingIds.length === 0) {
    return {
      total: 0,
      usable: 0,
      threshold: 10,
      siblingIds: [],
      name: productDoc.name,
    }
  }

  const rows = await Model.find({
    product: { $in: siblingIds },
    isDeleted: { $ne: true },
    isActive: true,
  }).lean()

  let total = 0
  let usable = 0
  let threshold = 0

  for (const row of rows) {
    const qty = row.quantity || 0
    total += qty
    threshold = Math.max(threshold, row.threshold ?? 10)
    const expiry = expiryById.get(String(row.product))
    const expired = expiry ? new Date(expiry) <= today : false
    if (!expired) usable += qty
  }

  return {
    total,
    usable,
    threshold: threshold || 10,
    siblingIds,
    name: productDoc.name,
  }
}
