import Database, { sequelize } from "../database/database.js";
import initModels from "../models/index.js";
import User from "../models/UserModel.js";
import Category from "../models/categorymodel.js";
import DosageForm from "../models/dosageformsmodel.js";
import Supplier from "../models/Supplier.js";
import Product from "../models/ProductModel.js";
import Store from "../models/StoreModel.js";
import Dispensary from "../models/DispensaryModel.js";

async function seed() {
  console.log("Starting database seeding...");
  await Database();
  initModels();

  // 1. Seed Categories
  const categories = [
    "Antibiotics",
    "Analgesics & Antipyretics",
    "Cardiovascular",
    "Gastrointestinal",
    "Antidiabetic",
    "Vitamins & Supplements",
  ];
  for (const cat of categories) {
    await Category.findOrCreate({ where: { name: cat } });
  }
  console.log("Categories seeded");

  // 2. Seed Dosage Forms
  const dosageForms = ["Tablet", "Capsule", "Syrup", "Injection", "Suspension", "Ointment"];
  for (const df of dosageForms) {
    await DosageForm.findOrCreate({ where: { name: df } });
  }
  console.log("Dosage Forms seeded");

  // 3. Seed Suppliers
  const suppliers = [
    { name: "MedTech Pharma Supply", phone: "+251911223344", email: "info@medtechpharma.com", address: "Addis Ababa, Bole" },
    { name: "Global Health Import", phone: "+251922334455", email: "orders@globalhealth.com", address: "Addis Ababa, Merkato" },
    { name: "Ethio Drug Distribution", phone: "+251933445566", email: "sales@ethiodrug.com", address: "Addis Ababa, Piazza" },
  ];
  for (const sup of suppliers) {
    await Supplier.findOrCreate({ where: { name: sup.name }, defaults: sup });
  }
  console.log("Suppliers seeded");

  // 4. Find Admin User
  const admin = await User.findOne({ where: { role: "superAdmin" } });
  const adminId = admin ? admin.id : 1;

  // 5. Seed Products
  const sampleProducts = [
    {
      name: "Paracetamol 500mg",
      brand: "Panadol",
      category: "Analgesics & Antipyretics",
      DosageForms: "Tablet",
      batchNo: "BATCH-PCM-001",
      unitPrice: 15.0,
      markup: 33.33,
      sellingPrice: 20.0,
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year ahead
      storeQty: 500,
      dispensaryQty: 100,
      threshold: 50,
    },
    {
      name: "Paracetamol 500mg",
      brand: "Panadol",
      category: "Analgesics & Antipyretics",
      DosageForms: "Tablet",
      batchNo: "BATCH-PCM-002",
      unitPrice: 16.0,
      markup: 25.0,
      sellingPrice: 20.0,
      expiryDate: new Date(Date.now() + 500 * 24 * 60 * 60 * 1000),
      storeQty: 300,
      dispensaryQty: 80,
      threshold: 40,
    },
    {
      name: "Amoxicillin 500mg",
      brand: "Amoxil",
      category: "Antibiotics",
      DosageForms: "Capsule",
      batchNo: "BATCH-AMX-101",
      unitPrice: 35.0,
      markup: 42.86,
      sellingPrice: 50.0,
      expiryDate: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000),
      storeQty: 400,
      dispensaryQty: 120,
      threshold: 60,
    },
    {
      name: "Ibuprofen 400mg",
      brand: "Brufen",
      category: "Analgesics & Antipyretics",
      DosageForms: "Tablet",
      batchNo: "BATCH-IBU-201",
      unitPrice: 25.0,
      markup: 40.0,
      sellingPrice: 35.0,
      expiryDate: new Date(Date.now() + 400 * 24 * 60 * 60 * 1000),
      storeQty: 250,
      dispensaryQty: 60,
      threshold: 30,
    },
    {
      name: "Omeprazole 20mg",
      brand: "Losec",
      category: "Gastrointestinal",
      DosageForms: "Capsule",
      batchNo: "BATCH-OMP-301",
      unitPrice: 45.0,
      markup: 33.33,
      sellingPrice: 60.0,
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      storeQty: 180,
      dispensaryQty: 50,
      threshold: 25,
    },
    {
      name: "Metformin 500mg",
      brand: "Glucophage",
      category: "Antidiabetic",
      DosageForms: "Tablet",
      batchNo: "BATCH-MET-401",
      unitPrice: 30.0,
      markup: 33.33,
      sellingPrice: 40.0,
      expiryDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
      storeQty: 300,
      dispensaryQty: 90,
      threshold: 35,
    },
    {
      name: "Ciprofloxacin 500mg",
      brand: "Cipro",
      category: "Antibiotics",
      DosageForms: "Tablet",
      batchNo: "BATCH-CIP-501",
      unitPrice: 50.0,
      markup: 40.0,
      sellingPrice: 70.0,
      expiryDate: new Date(Date.now() + 320 * 24 * 60 * 60 * 1000),
      storeQty: 200,
      dispensaryQty: 40,
      threshold: 20,
    },
    {
      name: "Vitamin C 1000mg",
      brand: "Redoxon",
      category: "Vitamins & Supplements",
      DosageForms: "Tablet",
      batchNo: "BATCH-VTC-601",
      unitPrice: 20.0,
      markup: 50.0,
      sellingPrice: 30.0,
      expiryDate: new Date(Date.now() + 600 * 24 * 60 * 60 * 1000),
      storeQty: 350,
      dispensaryQty: 100,
      threshold: 40,
    },
  ];

  for (const item of sampleProducts) {
    const existing = await Product.findOne({ where: { batchNo: item.batchNo } });
    if (!existing) {
      const totalQty = item.storeQty + item.dispensaryQty;
      const product = await Product.create({
        name: item.name,
        brand: item.brand,
        category: item.category,
        DosageForms: item.DosageForms,
        batchNo: item.batchNo,
        unitPrice: item.unitPrice,
        markup: item.markup,
        sellingPrice: item.sellingPrice,
        quantity: totalQty,
        totalPrice: item.unitPrice * totalQty,
        totalSellingPrice: item.sellingPrice * totalQty,
        expiryDate: item.expiryDate,
        addedBy: adminId,
        visibility: "enable",
        distributor: { name: "MedTech Pharma Supply", contact: "+251911223344" },
      });

      // Create Store record
      await Store.create({
        productId: product.id,
        quantity: item.storeQty,
        initialStoreQty: item.storeQty,
        threshold: item.threshold,
        status: item.storeQty > item.threshold ? "In Stock" : "Low Stock",
        isActive: true,
      });

      // Create Dispensary record
      await Dispensary.create({
        productId: product.id,
        quantity: item.dispensaryQty,
        initialDispensaryQty: item.dispensaryQty,
        threshold: item.threshold,
        status: item.dispensaryQty > item.threshold ? "In Stock" : "Low Stock",
        isActive: true,
      });

      console.log(`Created product: ${item.name} (${item.batchNo})`);
    }
  }

  console.log("Seeding complete! Database is now populated with sample inventory.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding error:", err);
  process.exit(1);
});
