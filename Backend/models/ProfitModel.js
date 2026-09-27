import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database/database.js";

class Profit extends Model {
  toJSON() {
    const values = { ...this.get() };
    values._id = values.id;
    return values;
  }
}

Profit.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    daily: {
      type: DataTypes.DOUBLE,
      defaultValue: 0,
    },
    monthly: {
      type: DataTypes.DOUBLE,
      defaultValue: 0,
    },
    yearly: {
      type: DataTypes.DOUBLE,
      defaultValue: 0,
    },
    lastDaily: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastMonthly: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastYearly: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastUpdated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: "Profit",
    tableName: "profits",
    timestamps: true,
  }
);

export default Profit;