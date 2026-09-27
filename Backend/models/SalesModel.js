import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database/database.js";

class Sales extends Model {
  toJSON() {
    const values = { ...this.get() };
    values._id = values.id;
    values.product = values.productId;
    values.pharmacist = values.pharmacistUser || values.pharmacistId;
    values.cashier = values.cashierUser || values.cashierId;
    return values;
  }
}

Sales.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    transactionId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    patientName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "productId",
    },
    product: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.productId;
      },
      set(val) {
        this.setDataValue("productId", val);
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dosageForm: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    quantitySold: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    profit: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    saleAmount: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    sellingPrice: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    totalUnitPrice: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("pending", "completed", "aborted", "credit", "partial", "refunded"),
      allowNull: true,
    },
    paymentStatus: {
      type: DataTypes.ENUM("pending", "paid", "partial", "credit", "overdue"),
      defaultValue: "pending",
    },
    amountPaid: {
      type: DataTypes.DOUBLE,
      defaultValue: 0,
    },
    remainingBalance: {
      type: DataTypes.DOUBLE,
      defaultValue: 0,
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    customerPhone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    customerAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    saleType: {
      type: DataTypes.ENUM("cash", "credit"),
      defaultValue: "cash",
    },
    creditApprovedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    creditApprovedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastPaymentDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    paymentHistory: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    pharmacistId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "pharmacist",
    },
    cashierId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "cashier",
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    abortedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    refundedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    refundedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: "Sales",
    tableName: "sales",
    timestamps: true,
    indexes: [
      { fields: ["transactionId"] },
      { fields: ["status", "timestamp"] },
      { fields: ["status", "completedAt"] },
      { fields: ["transactionId", "status"] },
      { fields: ["cashier", "status", "completedAt"] },
      { fields: ["saleType", "status", "paymentStatus", "timestamp"] },
      { fields: ["productId", "status", "completedAt"] },
      { fields: ["dueDate", "paymentStatus"] },
      { fields: ["customerPhone"] },
    ],
  }
);

export default Sales;