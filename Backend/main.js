import express from "express"
import dotenv from "dotenv"
import cors from "cors";
const app =express();
app.use(express.json())
app.use(cors());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
dotenv.config();
app.post("api/new/test",(req,res)=>{
    res.send("Hello World");
})
app.listen(process.env.PORT,()=>{
    console.log("server is running on port 5000")
})