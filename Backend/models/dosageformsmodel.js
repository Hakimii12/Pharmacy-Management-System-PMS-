import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database/database.js";

class DosageForm extends Model {
  toJSON() {
    const values = { ...this.get() };
    values._id = values.id;
    return values;
  }
}

DosageForm.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  },
  {
    sequelize,
    modelName: "DosageForm",
    tableName: "dosage_forms",
    timestamps: true,
  }
);

export default DosageForm;