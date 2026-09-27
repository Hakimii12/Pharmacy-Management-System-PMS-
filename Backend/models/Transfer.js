import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database/database.js";

class Transfare extends Model {
  toJSON() {
    const values = { ...this.get() };
    values._id = values.id;
    values.product = values.productId;
    values.user = values.userId;
    return values;
  }
}

Transfare.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
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
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "userId",
    },
    user: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.userId;
      },
      set(val) {
        this.setDataValue("userId", val);
      },
    },
    type: {
      type: DataTypes.ENUM(
        "ISSUE_TO_DISPENSARY",
        "RETURN_TO_STORE",
        "UPDATED_IN_STORE",
        "UPDATED_IN_DISPENSARY",
        "RETURN_REFUND",
        "CREDIT_REFUND",
        "INVENTORY_ADJUSTMENT",
        "PURCHASE_RECEIPT"
      ),
      allowNull: false,
    },
    adjustmentReason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    UpdateType: {
      type: DataTypes.ENUM("QUANTITY_ADDED", "QUANTITY_DEDUCTED"),
      allowNull: true,
    },
    quantity: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    quantityLeft: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    totalQuantity: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    issuedPrice: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    unitPrice: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    totalIssuedPrice: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    totalUnitPrice: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: "Transfare",
    tableName: "transfares",
    timestamps: true,
    indexes: [
      { fields: ["productId", "type"] },
      { fields: ["productId", "date"] },
      { fields: ["type", "date"] },
    ],
  }
);

export default Transfare;