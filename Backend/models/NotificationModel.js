import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database/database.js";

class Notification extends Model {
  toJSON() {
    const values = { ...this.get() };
    values._id = values.id;
    values.product = values.productId;
    return values;
  }
}

Notification.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    type: {
      type: DataTypes.ENUM("Expired", "OutOfStock", "NearExpiry", "LowStock"),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
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
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    location: {
      type: DataTypes.ENUM("store", "dispensary", "both"),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Notification",
    tableName: "notifications",
    timestamps: true,
    indexes: [
      { fields: ["productId", "type", "read", "location"] },
    ],
  }
);

export default Notification;