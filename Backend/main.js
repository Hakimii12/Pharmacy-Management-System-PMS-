import express from "express";
import dotenv from "dotenv";
dotenv.config(); // Load ENV first

import cors from "cors";
import cookieParser from "cookie-parser";
import Database from "./database/database.js";
import DrugStore from "./routes/DrugRoutes.js";
import SalesRoutes from "./routes/SalesRoutes.js";
import UserRoutes from "./routes/UserRoutes.js";
import { startExpirationChecker } from "./utils/expairDateCounter.js";
import NotificationRoutes from "./routes/NotificationRoutes.js";
import ProfitRoutes from "./routes/ProfitRoutes.js";
import DosageFormsCategoryRoutes from "./routes/DosageForms&categoryRoutes.js";

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:5174',
    'http://localhost:5173',
    "https://hamzamasjidpharamacy.onrender.com"
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use("/api/product", DrugStore);
app.use("/api/sales", SalesRoutes);
app.use("/api/user", UserRoutes);
app.use("/api/notify", NotificationRoutes);
app.use("/api/profit", ProfitRoutes);
app.use("/api/form", DosageFormsCategoryRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Initialize DB and start expiration checker
Database().then(() => {
  startExpirationChecker();
});

// Start server (FIXED BINDING)
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});