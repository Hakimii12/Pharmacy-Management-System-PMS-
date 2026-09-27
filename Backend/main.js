import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from project root
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import Database from "./database/database.js";
import DrugStore from "./routes/DrugRoutes.js";
import SalesRoutes from "./routes/SalesRoutes.js";
import UserRoutes from "./routes/UserRoutes.js";
import { startExpirationChecker } from "./utils/expairDateCounter.js";
import NotificationRoutes from "./routes/NotificationRoutes.js";
import ProfitRoutes from "./routes/ProfitRoutes.js";
import DosageFormsRoutes from "./routes/dosageformsandcategoryroutes.js";
import InventoryRoutes from "./routes/InventoryRoutes.js";
import PurchaseRoutes from "./routes/PurchaseRoutes.js";

const app = express();
app.use(express.json());

const allowedOrigins = [
  "http://localhost:5174",
  "http://localhost:5173",
  "http://localhost:5000",
  "https://hamzamasjidpharamacy.onrender.com",
];
if (process.env.CLIENT_URL) {
  allowedOrigins.push(...process.env.CLIENT_URL.split(",").map((s) => s.trim()));
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === "production") {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/product", DrugStore);
app.use("/api/sales", SalesRoutes);
app.use("/api/user", UserRoutes);
app.use("/api/notify", NotificationRoutes);
app.use("/api/profit", ProfitRoutes);
app.use("/api/form", DosageFormsRoutes);
app.use("/api/inventory", InventoryRoutes);
app.use("/api/purchase", PurchaseRoutes);

// In production, serve built frontend static assets
const frontendDist = path.join(__dirname, "../Frontend/dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

Database()
  .then(() => {
    startExpirationChecker();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database connection failed", err);
    process.exit(1);
  });
