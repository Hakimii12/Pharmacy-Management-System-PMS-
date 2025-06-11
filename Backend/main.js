import express from "express"
import dotenv from "dotenv"
import cors from "cors";
app.use(express.json())
app.use(cors());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());