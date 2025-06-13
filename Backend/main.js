import express from "express"
import dotenv from "dotenv"
import cors from "cors";
import cookieParser from "cookie-parser";
import Database from "./database/database.js";
import DrugStore from "./routes/DrugRoutes.js";
const app =express();
app.use(express.json())
app.use(cors());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
dotenv.config();
app.use("/api", DrugStore);
//Database connection initialization
Database();
app.listen(process.env.PORT,()=>{
    console.log(`server is running on port ${process.env.PORT}`)
})
