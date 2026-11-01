// Helper function to handle price interdependencies
const round2 = (num) => Math.round((Number(num) + Number.EPSILON) * 100) / 100;

export function calculateInterdependentPrices(existingProduct = {}, updates = {}) {
  const result = { ...updates };
  
  const hasSp = result.sellingPrice !== undefined && result.sellingPrice !== "" && !Number.isNaN(Number(result.sellingPrice));
  const hasUp = result.unitPrice !== undefined && result.unitPrice !== "" && !Number.isNaN(Number(result.unitPrice));
  const hasMk = result.markup !== undefined && result.markup !== "" && !Number.isNaN(Number(result.markup));

  const sp = hasSp ? Number(result.sellingPrice) : undefined;
  const up = hasUp ? Number(result.unitPrice) : undefined;
  const mk = hasMk ? Number(result.markup) : undefined;

  // If explicit calculateTarget is provided:
  if (result.calculateTarget === "unitPrice" && sp !== undefined && mk !== undefined) {
    result.unitPrice = round2(sp / (1 + mk / 100));
  } else if (result.calculateTarget === "sellingPrice" && up !== undefined && mk !== undefined) {
    result.sellingPrice = round2(up * (1 + mk / 100));
  } else if (result.calculateTarget === "markup" && sp !== undefined && up !== undefined && up > 0) {
    result.markup = round2(((sp - up) / up) * 100);
  }
  // If sellingPrice and markup are provided but unitPrice is not (or <= 0)
  else if (sp !== undefined && mk !== undefined && (up === undefined || up <= 0)) {
    result.unitPrice = round2(sp / (1 + mk / 100));
  }
  // If unitPrice and markup are provided but sellingPrice is not
  else if (up !== undefined && mk !== undefined && (sp === undefined || sp <= 0)) {
    result.sellingPrice = round2(up * (1 + mk / 100));
  }
  // If sellingPrice and unitPrice are provided but markup is not
  else if (sp !== undefined && up !== undefined && (mk === undefined || mk < 0)) {
    result.markup = up > 0 ? round2(((sp - up) / up) * 100) : 0;
  }
  // If only sellingPrice is provided
  else if (sp !== undefined && up === undefined && mk === undefined) {
    if (existingProduct.markup !== undefined) {
      result.markup = Number(existingProduct.markup);
      result.unitPrice = round2(sp / (1 + Number(existingProduct.markup) / 100));
    } else if (existingProduct.unitPrice !== undefined && Number(existingProduct.unitPrice) > 0) {
      result.unitPrice = Number(existingProduct.unitPrice);
      result.markup = round2(((sp - Number(existingProduct.unitPrice)) / Number(existingProduct.unitPrice)) * 100);
    }
  }
  // If only markup is provided
  else if (mk !== undefined && up === undefined && sp === undefined) {
    if (existingProduct.unitPrice !== undefined) {
      result.unitPrice = Number(existingProduct.unitPrice);
      result.sellingPrice = round2(Number(existingProduct.unitPrice) * (1 + mk / 100));
    }
  }
  // If only unitPrice is provided
  else if (up !== undefined && sp === undefined && mk === undefined) {
    if (existingProduct.markup !== undefined) {
      result.markup = Number(existingProduct.markup);
      result.sellingPrice = round2(up * (1 + Number(existingProduct.markup) / 100));
    }
  }

  // Ensure any calculated or passed numerical values are properly rounded
  if (result.unitPrice !== undefined && result.unitPrice !== "") result.unitPrice = round2(result.unitPrice);
  if (result.sellingPrice !== undefined && result.sellingPrice !== "") result.sellingPrice = round2(result.sellingPrice);
  if (result.markup !== undefined && result.markup !== "") result.markup = round2(result.markup);
  
  delete result.calculateTarget;
  return result;
}
