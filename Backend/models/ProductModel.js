import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database/database.js";

class Product extends Model {
  toJSON() {
    const values = { ...this.get() };
    values._id = values.id;
    return values;
  }
}

Product.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    addedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    unitPrice: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 0,
    },
    quantity: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 0,
    },
    visibility: {
      type: DataTypes.ENUM("enable", "disable", "deleted"),
      defaultValue: "enable",
    },
    totalPrice: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 0,
    },
    batchNo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    markup: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 0,
    },
    sellingPrice: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 0,
    },
    totalSellingPrice: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 0,
    },
    DosageForms: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    distributor: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: { name: "", contact: "" },
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    deletedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Product",
    tableName: "products",
    timestamps: true,
    indexes: [
      { fields: ["name"] },
      { fields: ["batchNo"] },
      { fields: ["isDeleted", "visibility", "createdAt"] },
      { fields: ["expiryDate", "isDeleted"] },
      { fields: ["category", "isDeleted"] },
    ],
  }
);

export default Product;
