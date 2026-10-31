// Helper function to handle price interdependencies
const round2 = (num) => Math.round((Number(num) + Number.EPSILON) * 100) / 100;

export function calculateInterdependentPrices(existingProduct = {}, updates = {}) {
  const result = { ...updates };
  
  // If sellingPrice and markup are provided but unitPrice is not
  if (result.sellingPrice !== undefined && result.markup !== undefined && result.unitPrice === undefined) {
    result.unitPrice = round2(Number(result.sellingPrice) / (1 + Number(result.markup) / 100));
  }
  // If unitPrice and markup are provided but sellingPrice is not
  else if (result.unitPrice !== undefined && result.markup !== undefined && result.sellingPrice === undefined) {
    result.sellingPrice = round2(Number(result.unitPrice) * (1 + Number(result.markup) / 100));
  }
  // If sellingPrice and unitPrice are provided but markup is not
  else if (result.sellingPrice !== undefined && result.unitPrice !== undefined && result.markup === undefined) {
    const up = Number(result.unitPrice);
    result.markup = up > 0 ? round2(((Number(result.sellingPrice) - up) / up) * 100) : 0;
  }
  // If only sellingPrice is provided
  else if (result.sellingPrice !== undefined && result.unitPrice === undefined && result.markup === undefined) {
    if (existingProduct.markup !== undefined) {
      result.unitPrice = round2(Number(result.sellingPrice) / (1 + Number(existingProduct.markup) / 100));
    } else if (existingProduct.unitPrice !== undefined && Number(existingProduct.unitPrice) > 0) {
      result.markup = round2(((Number(result.sellingPrice) - Number(existingProduct.unitPrice)) / Number(existingProduct.unitPrice)) * 100);
    }
  }
  // If only markup is provided
  else if (result.markup !== undefined && result.unitPrice === undefined && result.sellingPrice === undefined) {
    if (existingProduct.unitPrice !== undefined) {
      result.sellingPrice = round2(Number(existingProduct.unitPrice) * (1 + Number(result.markup) / 100));
    }
  }
  // If only unitPrice is provided
  else if (result.unitPrice !== undefined && result.sellingPrice === undefined && result.markup === undefined) {
    if (existingProduct.markup !== undefined) {
      result.sellingPrice = round2(Number(result.unitPrice) * (1 + Number(existingProduct.markup) / 100));
    }
  }

  // Ensure any calculated or passed numerical values are properly rounded
  if (result.unitPrice !== undefined) result.unitPrice = round2(result.unitPrice);
  if (result.sellingPrice !== undefined) result.sellingPrice = round2(result.sellingPrice);
  if (result.markup !== undefined) result.markup = round2(result.markup);
  
  return result;
}
