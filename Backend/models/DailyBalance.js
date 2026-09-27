import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database/database.js";

class DailyBalance extends Model {
  toJSON() {
    const values = { ...this.get() };
    values._id = values.id;
    return values;
  }
}

DailyBalance.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    cashier: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    expectedAmount: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 0,
    },
    countedAmount: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 0,
    },
    difference: {
      type: DataTypes.DOUBLE,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("verified", "discrepancy"),
      allowNull: false,
    },
    transactions: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    discrepancyNote: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    closedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    closedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: "DailyBalance",
    tableName: "daily_balances",
    timestamps: true,
    indexes: [
      { fields: ["cashier", "date"] },
    ],
    hooks: {
      beforeSave: (instance) => {
        if (instance.countedAmount !== undefined && instance.expectedAmount !== undefined) {
          instance.difference = instance.countedAmount - instance.expectedAmount;
        }
      },
    },
  }
);

export default DailyBalance;
