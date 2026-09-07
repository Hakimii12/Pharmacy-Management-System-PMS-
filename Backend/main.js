import dotenv from "dotenv"
// Load env vars FIRST — before any other module reads process.env
dotenv.config()

import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import Database from "./database/database.js"
import DrugStore from "./routes/DrugRoutes.js"
import SalesRoutes from "./routes/SalesRoutes.js"
import UserRoutes from "./routes/UserRoutes.js"
import { startExpirationChecker } from "./utils/expairDateCounter.js"
import NotificationRoutes from "./routes/NotificationRoutes.js"
import ProfitRoutes from "./routes/ProfitRoutes.js"
import DosageFormsRoutes from "./routes/dosageformsandcategoryroutes.js"
import InventoryRoutes from "./routes/InventoryRoutes.js"
import PurchaseRoutes from "./routes/PurchaseRoutes.js"

const app = express()
app.use(express.json())
app.use(
  cors({
    origin: ["http://localhost:5174", "http://localhost:5173", "https://hamzamasjidpharamacy.onrender.com"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
)
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use("/api/product", DrugStore)
app.use("/api/sales", SalesRoutes)
app.use("/api/user", UserRoutes)
app.use("/api/notify", NotificationRoutes)
app.use("/api/profit", ProfitRoutes)
app.use("/api/form", DosageFormsRoutes)
app.use("/api/inventory", InventoryRoutes)
app.use("/api/purchase", PurchaseRoutes)

Database()
  .then(() => {
    // Start the cron job ONCE, only after DB is ready
    startExpirationChecker()
    const PORT = process.env.PORT || 3000
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port http://localhost:${PORT}`)
    })
  })
  .catch((err) => {
    console.error("Database connection failed", err)
    process.exit(1)
  })
