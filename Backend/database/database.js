import mongoose from "mongoose";
import dotenv from 'dotenv'
// import User from "../models/User.js";
import bcrypt from 'bcryptjs'
async function Database() {
  dotenv.config()
  const db_string = process.env.DATABASE_URL
  try {
    await mongoose.connect(db_string, { 
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000
    });
    
    console.log("Successfully connected to the database");

//     const adminExists = await User.findOne({ role: 'admin' });
//     if (!adminExists) {
//       const admin = new User({
//         name: 'Admin',
//         email: 'ictcenter@astu.com',
//         password: await bcrypt.hash("123qweQWE@", 10),
//         role: 'admin',
//         title: 'System Administrator',
//         status: 'approved',
//       });
//       await admin.save();
//       console.log('Initial admin created');
//     }
  } catch (error) {
    console.error('Database connection error:', error);
  }
}
export default Database