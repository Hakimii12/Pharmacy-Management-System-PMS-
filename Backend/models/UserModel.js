import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database/database.js";

class User extends Model {
  toJSON() {
    const values = { ...this.get() };
    values._id = values.id;
    return values;
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("pharmacist", "cashier", "admin", "superAdmin"),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("approved", "pending", "rejected", "suspended"),
      defaultValue: "pending",
    },
    suspendedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "User",
    tableName: "users",
    timestamps: true,
  }
);

export default User;