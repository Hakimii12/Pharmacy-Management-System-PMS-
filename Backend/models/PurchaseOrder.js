import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database/database.js";

class PurchaseOrder extends Model {
  toJSON() {
    const values = { ...this.get() };
    values._id = values.id;
    values.supplier = values.supplierId;
    return values;
  }
}

PurchaseOrder.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    orderNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    supplierId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "supplierId",
    },
    supplier: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.supplierId;
      },
      set(val) {
        this.setDataValue("supplierId", val);
      },
    },
    status: {
      type: DataTypes.ENUM("draft", "ordered", "partial", "received", "cancelled"),
      defaultValue: "draft",
    },
    lines: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    expectedDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    orderedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    receivedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    receivedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "PurchaseOrder",
    tableName: "purchase_orders",
    timestamps: true,
    indexes: [
      { fields: ["orderNumber"] },
      { fields: ["status", "createdAt"] },
      { fields: ["supplierId", "createdAt"] },
    ],
  }
);

export default PurchaseOrder;
