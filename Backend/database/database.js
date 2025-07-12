import mongoose from "mongoose";
import dotenv from 'dotenv'
import User from "../models/UserModel.js";
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

    const adminExists = await User.findOne({ role: 'superAdmin' });
    if (!adminExists) {
      const admin = new User({
        name: 'superAdmin',
        email: 'hamzaMasjid@drug.com',
        password: await bcrypt.hash("demo123", 10),
        role: 'admin',
        title: 'System Administrator',
        status: 'approved',
      });
      await admin.save();
      console.log('Initial admin created');
    }
  } catch (error) {
    console.error('Database connection error:', error);
  }
}
export default Database