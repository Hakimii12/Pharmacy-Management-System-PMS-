export const products = [
  {
    id: 1,
    name: "Paracetamol",
    brand: "Panadol",
    unitPrice: 5.99,
    quantity: 120,
    totalPrice: 718.80,
    expirationDate: "2024-12-31",
    batchNumber: "PAN202312",
    markup: 25,
    isExpired: false,
    category: "Pain Relief",
    status: "In Stock"
  },
  {
    id: 2,
    name: "Ibuprofen",
    brand: "Advil",
    unitPrice: 8.50,
    quantity: 85,
    totalPrice: 722.50,
    expirationDate: "2024-10-15",
    batchNumber: "ADV202310",
    markup: 30,
    isExpired: false,
    category: "Pain Relief",
    status: "In Stock"
  },
  {
    id: 3,
    name: "Amoxicillin",
    brand: "Amoxil",
    unitPrice: 12.75,
    quantity: 0,
    totalPrice: 0,
    expirationDate: "2023-11-30",
    batchNumber: "AMX202311",
    markup: 35,
    isExpired: false,
    category: "Antibiotic",
    status: "Sold Out"
  },
  {
    id: 4,
    name: "Loratadine",
    brand: "Claritin",
    unitPrice: 7.25,
    quantity: 45,
    totalPrice: 326.25,
    expirationDate: "2023-12-15",
    batchNumber: "CLR202312",
    markup: 40,
    isExpired: false,
    category: "Allergy",
    status: "Low Stock"
  },
  {
    id: 5,
    name: "Omeprazole",
    brand: "Prilosec",
    unitPrice: 9.99,
    quantity: 60,
    totalPrice: 599.40,
    expirationDate: "2022-05-30",
    batchNumber: "PRI202205",
    markup: 30,
    isExpired: true,
    category: "Acid Reducer",
    status: "Expired"
  },
  {
    id: 6,
    name: "Cetirizine",
    brand: "Zyrtec",
    unitPrice: 6.50,
    quantity: 90,
    totalPrice: 585.00,
    expirationDate: "2025-02-28",
    batchNumber: "ZYR202502",
    markup: 35,
    isExpired: false,
    category: "Allergy",
    status: "In Stock"
  },
  {
    id: 7,
    name: "Simvastatin",
    brand: "Zocor",
    unitPrice: 15.25,
    quantity: 30,
    totalPrice: 457.50,
    expirationDate: "2024-07-31",
    batchNumber: "ZOC202407",
    markup: 45,
    isExpired: false,
    category: "Cholesterol",
    status: "In Stock"
  },
  {
    id: 8,
    name: "Metformin",
    brand: "Glucophage",
    unitPrice: 4.75,
    quantity: 150,
    totalPrice: 712.50,
    expirationDate: "2025-01-15",
    batchNumber: "GLU202501",
    markup: 20,
    isExpired: false,
    category: "Diabetes",
    status: "In Stock"
  },
  {
    id: 9,
    name: "Aspirin",
    brand: "Bayer",
    unitPrice: 3.25,
    quantity: 200,
    totalPrice: 650.00,
    expirationDate: "2026-03-31",
    batchNumber: "BAY202603",
    markup: 15,
    isExpired: false,
    category: "Pain Relief",
    status: "In Stock"
  },
  {
    id: 10,
    name: "Diphenhydramine",
    brand: "Benadryl",
    unitPrice: 5.50,
    quantity: 25,
    totalPrice: 137.50,
    expirationDate: "2024-05-31",
    batchNumber: "BEN202405",
    markup: 30,
    isExpired: false,
    category: "Allergy",
    status: "Low Stock"
  }
];

export const inventoryStats = {
  totalCostValue: 12500.75,
  totalSellingValue: 15800.95,
  potentialProfit: 3300.20,
  totalItems: 42,
  nearExpiry: 5,
  expired: 2,
  lowStock: 7
};

export const productCategories = [
  "medicine","cosmetic","Supplements","Medical Equipment"
];