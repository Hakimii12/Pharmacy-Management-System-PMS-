// Helper function to handle price interdependencies
export function calculateInterdependentPrices(existingProduct, updates) {
  const result = { ...updates };
  
  // If sellingPrice and markup are provided but unitPrice is not
  if (result.sellingPrice !== undefined && result.markup !== undefined && result.unitPrice === undefined) {
    result.unitPrice = result.sellingPrice / (1 + result.markup / 100);
  }
  // If unitPrice and markup are provided but sellingPrice is not
  else if (result.unitPrice !== undefined && result.markup !== undefined && result.sellingPrice === undefined) {
    result.sellingPrice = result.unitPrice * (1 + result.markup / 100);
  }
  // If sellingPrice and unitPrice are provided but markup is not
  else if (result.sellingPrice !== undefined && result.unitPrice !== undefined && result.markup === undefined) {
    result.markup = ((result.sellingPrice / result.unitPrice) - 1) * 100;
  }
  // If only sellingPrice is provided
  else if (result.sellingPrice !== undefined && result.unitPrice === undefined && result.markup === undefined) {
    if (existingProduct.markup !== undefined) {
      result.unitPrice = result.sellingPrice / (1 + existingProduct.markup / 100);
    } else if (existingProduct.unitPrice !== undefined) {
      result.markup = ((result.sellingPrice / existingProduct.unitPrice) - 1) * 100;
    }
  }
  // If only markup is provided
  else if (result.markup !== undefined && result.unitPrice === undefined && result.sellingPrice === undefined) {
    if (existingProduct.unitPrice !== undefined) {
      result.sellingPrice = existingProduct.unitPrice * (1 + result.markup / 100);
    }
  }
  // If only unitPrice is provided
  else if (result.unitPrice !== undefined && result.sellingPrice === undefined && result.markup === undefined) {
    if (existingProduct.markup !== undefined) {
      result.sellingPrice = result.unitPrice * (1 + existingProduct.markup / 100);
    }
  }
  
  return result;
}