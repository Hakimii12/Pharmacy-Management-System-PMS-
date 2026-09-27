import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database/database.js";
import Product from "./ProductModel.js";

class Dispensary extends Model {
  toJSON() {
    const values = { ...this.get() };
    values._id = values.id;
    values.product = values.productId;
    return values;
  }

  async updateStatusFields() {
    const product = await Product.findByPk(this.productId);
    if (!product || this.isDeleted || !this.isActive) {
      this.status = "Sold Out";
      this.isExpired = false;
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiryDate = new Date(product.expiryDate);
    this.isExpired = expiryDate <= today;

    if (this.quantity === 0) {
      this.status = "Sold Out";
    } else if (this.isExpired) {
      this.status = "Expired";
    } else {
      const { sumLocationStockForIdentity } = await import("../utils/productIdentity.js");
      const stock = await sumLocationStockForIdentity(product, "dispensary");
      if (stock.usable <= stock.threshold) {
        this.status = "Low Stock";
      } else {
        this.status = "In Stock";
      }
    }
  }

  static async updateStatus(productId) {
    const dispensary = await Dispensary.findOne({ where: { productId } });
    if (!dispensary) return;
    await dispensary.updateStatusFields();
    await dispensary.save();
  }
}

Dispensary.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
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
    quantity: {
      type: DataTypes.DOUBLE,
      defaultValue: 0,
    },
    initialDispensaryQty: {
      type: DataTypes.DOUBLE,
      defaultValue: 0,
    },
    threshold: {
      type: DataTypes.DOUBLE,
      defaultValue: 10,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
    status: {
      type: DataTypes.ENUM("In Stock", "Low Stock", "Sold Out", "Expired"),
      defaultValue: "In Stock",
    },
    isExpired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: "Dispensary",
    tableName: "dispensaries",
    timestamps: true,
    hooks: {
      beforeSave: async (dispensary) => {
        await dispensary.updateStatusFields();
      },
      afterSave: async (dispensary) => {
        try {
          const Notification = (await import("./NotificationModel.js")).default;
          const { sumLocationStockForIdentity } = await import("../utils/productIdentity.js");
          const product = await Product.findByPk(dispensary.productId);
          if (!product) return;

          if (dispensary.isExpired && dispensary.quantity > 0 && !dispensary.isDeleted && dispensary.isActive) {
            const existingExpired = await Notification.findOne({
              where: {
                productId: dispensary.productId,
                location: "dispensary",
                type: "Expired",
                read: false,
              },
            });
            if (!existingExpired) {
              await Notification.create({
                type: "Expired",
                message: `Product ${product.name} (batch ${product.batchNo || "—"}) is expired in dispensary.`,
                productId: dispensary.productId,
                location: "dispensary",
                read: false,
              });
            }
          } else {
            await Notification.destroy({
              where: {
                productId: dispensary.productId,
                location: "dispensary",
                type: "Expired",
                read: false,
              },
            });
          }

          const stock = await sumLocationStockForIdentity(product, "dispensary");
          if (stock.siblingIds.length === 0) return;

          const { Op } = await import("sequelize");
          await Notification.destroy({
            where: {
              productId: { [Op.in]: stock.siblingIds },
              location: "dispensary",
              type: { [Op.in]: ["LowStock", "OutOfStock"] },
              read: false,
            },
          });

          if (stock.usable <= 0) {
            if (stock.total <= 0) {
              await Notification.create({
                type: "OutOfStock",
                message: `Product ${product.name} is out of stock in dispensary.`,
                productId: dispensary.productId,
                location: "dispensary",
                read: false,
              });
            }
            return;
          }

          if (stock.usable <= stock.threshold) {
            await Notification.create({
              type: "LowStock",
              message: `Product ${product.name} is low in dispensary. Current: ${stock.usable}, Threshold: ${stock.threshold}.`,
              productId: dispensary.productId,
              location: "dispensary",
              read: false,
            });
          }
        } catch (error) {
          console.error("Dispensary notification hook failed:", error);
        }
      },
    },
  }
);

export default Dispensary;
