import { Sequelize } from "sequelize";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../../.env") });

const caCertPath = path.join(__dirname, "../certs/ca.pem");
const hasCaCert = fs.existsSync(caCertPath);

const isSSL = process.env.DB_SSL === "true";
const rejectUnauthorized = process.env.DB_SSL_INSECURE !== "true";

export const sequelize = new Sequelize(
  process.env.DB_DATABASE || "defaultdb",
  process.env.DB_USERNAME || "avnadmin",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "10010", 10),
    dialect: "mysql",
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: isSSL
      ? {
          ssl: {
            ca: hasCaCert ? fs.readFileSync(caCertPath).toString() : undefined,
            rejectUnauthorized: rejectUnauthorized,
          },
        }
      : {},
  }
);

export let isDbConnected = false;
export let dbConnectionError = null;

export default async function Database() {
  const maxRetries = 10;
  let retries = 0;
  while (retries < maxRetries) {
    try {
      await sequelize.authenticate();
      isDbConnected = true;
      dbConnectionError = null;
      console.log("Successfully connected to MySQL database via Sequelize");
      break;
    } catch (error) {
      retries++;
      dbConnectionError = error.message;
      console.warn(`Database connection attempt ${retries}/${maxRetries} failed: ${error.message}. Retrying in 3s...`);
      if (retries >= maxRetries) {
        console.error("Database connection failed after maximum retries:", error.message);
        return false;
      }
      await new Promise((res) => setTimeout(res, 3000));
    }
  }

  if (!isDbConnected) {
    return false;
  }

  try {
    // Import models and associations
    const { default: initModels, User } = await import("../models/index.js");
    initModels();

    // Sync database tables
    await sequelize.sync({ alter: false });
    console.log("All models synchronized with MySQL");

    // Seed initial superAdmin if it doesn't exist
    const adminExists = await User.findOne({ where: { role: "superAdmin" } });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("demo123", 10);
      await User.create({
        name: "Hamza Masjid",
        email: "hamzamasjid@drug.com",
        password: hashedPassword,
        role: "superAdmin",
        status: "approved",
      });
      console.log("Initial superAdmin created");
    }
    return true;
  } catch (error) {
    console.error("Database setup error:", error.message);
    dbConnectionError = error.message;
    return false;
  }
}