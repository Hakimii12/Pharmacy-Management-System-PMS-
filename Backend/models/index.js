import { sequelize } from "../database/database.js";
import User from "./UserModel.js";
import Product from "./ProductModel.js";
import Store from "./StoreModel.js";
import Dispensary from "./DispensaryModel.js";
import Notification from "./NotificationModel.js";
import Sales from "./SalesModel.js";
import PurchaseOrder from "./PurchaseOrder.js";
import Transfare from "./Transfer.js";
import Supplier from "./Supplier.js";
import DailyBalance from "./DailyBalance.js";
import Profit from "./ProfitModel.js";
import Category from "./categorymodel.js";
import DosageForm from "./dosageformsmodel.js";

let initialized = false;

export default function initModels() {
  if (initialized) return;
  initialized = true;

  // Product <-> Store
  Product.hasOne(Store, { foreignKey: "productId", as: "store" });
  Store.belongsTo(Product, { foreignKey: "productId", as: "productDetails" });

  // Product <-> Dispensary
  Product.hasOne(Dispensary, { foreignKey: "productId", as: "dispensary" });
  Dispensary.belongsTo(Product, { foreignKey: "productId", as: "productDetails" });

  // Product <-> Notification
  Product.hasMany(Notification, { foreignKey: "productId", as: "notifications" });
  Notification.belongsTo(Product, { foreignKey: "productId", as: "productDetails" });

  // Product <-> Sales
  Product.hasMany(Sales, { foreignKey: "productId", as: "sales" });
  Sales.belongsTo(Product, { foreignKey: "productId", as: "productDetails" });

  // User <-> Sales (pharmacist & cashier)
  Sales.belongsTo(User, { foreignKey: "pharmacistId", as: "pharmacistUser" });
  Sales.belongsTo(User, { foreignKey: "cashierId", as: "cashierUser" });
  User.hasMany(Sales, { foreignKey: "pharmacistId", as: "pharmacistSales" });
  User.hasMany(Sales, { foreignKey: "cashierId", as: "cashierSales" });

  // Product <-> Transfer
  Product.hasMany(Transfare, { foreignKey: "productId", as: "transfers" });
  Transfare.belongsTo(Product, { foreignKey: "productId", as: "productDetails" });

  // User <-> Transfer
  User.hasMany(Transfare, { foreignKey: "userId", as: "userTransfers" });
  Transfare.belongsTo(User, { foreignKey: "userId", as: "userDetails" });

  // Supplier <-> PurchaseOrder
  Supplier.hasMany(PurchaseOrder, { foreignKey: "supplierId", as: "purchaseOrders" });
  PurchaseOrder.belongsTo(Supplier, { foreignKey: "supplierId", as: "supplierDetails" });

  // User <-> PurchaseOrder (createdBy, receivedBy)
  PurchaseOrder.belongsTo(User, { foreignKey: "createdBy", as: "creator" });
  PurchaseOrder.belongsTo(User, { foreignKey: "receivedBy", as: "receiver" });

  // User <-> DailyBalance (cashier, closedBy)
  DailyBalance.belongsTo(User, { foreignKey: "cashier", as: "cashierUser" });
  DailyBalance.belongsTo(User, { foreignKey: "closedBy", as: "closer" });
}

export {
  sequelize,
  User,
  Product,
  Store,
  Dispensary,
  Notification,
  Sales,
  PurchaseOrder,
  Transfare,
  Supplier,
  DailyBalance,
  Profit,
  Category,
  DosageForm,
};
