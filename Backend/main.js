import express from "express"
import dotenv from "dotenv"
import cors from "cors";
import cookieParser from "cookie-parser";
import Database from "./database/database.js";
import DrugStore from "./routes/DrugRoutes.js";
import SalesRoutes from "./routes/SalesRoutes.js"
import UserRoutes from "./routes/UserRoutes.js";
import {startExpirationChecker} from "./utils/expairDateCounter.js"
import NotificationRoutes from "./routes/NotificationRoutes.js"
import ProfitRoutes from "./routes/ProfitRoutes.js"
const app =express();
app.use(express.json())
app.use(cors({
    origin: ['http://localhost:5174','http://localhost:5173',"https://hamzamasjidpharamacy.onrender.com"],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }));
startExpirationChecker()
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
dotenv.config();
app.use("/api/product", DrugStore);
app.use("/api/sales", SalesRoutes);
app.use("/api/user", UserRoutes);
app.use("/api/notify", NotificationRoutes);
app.use("/api/profit",ProfitRoutes)
//Database connection initialization
Database();
app.listen(process.env.PORT,()=>{
    console.log(`server is running on port ${process.env.PORT}`)
})
