import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

import { sequelize } from "./database/database.js";
import Dispensary from "./models/DispensaryModel.js";
import Store from "./models/StoreModel.js";

async function updateInitialQuantities() {
  try {
    console.log("Connecting to MySQL database...");
    await sequelize.authenticate();
    console.log("Database connected successfully");

    console.log("Updating Dispensary initial quantities...");
    const [dispensaryResult] = await sequelize.query(
      "UPDATE dispensaries SET initialDispensaryQty = quantity WHERE initialDispensaryQty = 0 OR initialDispensaryQty IS NULL"
    );
    console.log("Updated Dispensary records");

    console.log("Updating Store initial quantities...");
    const [storeResult] = await sequelize.query(
      "UPDATE stores SET initialStoreQty = quantity WHERE initialStoreQty = 0 OR initialStoreQty IS NULL"
    );
    console.log("Updated Store records");

    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await sequelize.close();
    console.log("Database connection closed");
  }
}

updateInitialQuantities();