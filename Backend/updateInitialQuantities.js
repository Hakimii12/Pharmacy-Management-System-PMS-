import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import Dispensary from './models/DispensaryModel.js';
import Store from './models/StoreModel.js';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the .env file in the root directory
dotenv.config({ path: join(__dirname, '..', '.env') });

async function updateInitialQuantities() {
  try {
    console.log('Connecting to database...');
    console.log('Database URL:', process.env.DATABASE_URL ? 'Found' : 'Not found');
    
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    await mongoose.connect(process.env.DATABASE_URL, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000
    });
    console.log('Database connected successfully');

    // Update Dispensary documents
    console.log('Updating Dispensary documents...');
    const dispensaryUpdateResult = await Dispensary.updateMany(
      {},
      [{ $set: { initialDispensaryQty: "$quantity" } }]
    );
    console.log(`Updated ${dispensaryUpdateResult.modifiedCount} Dispensary documents`);

    // Update Store documents
    console.log('Updating Store documents...');
    const storeUpdateResult = await Store.updateMany(
      {},
      [{ $set: { initialStoreQty: "$quantity" } }]
    );
    console.log(`Updated ${storeUpdateResult.modifiedCount} Store documents`);

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('Database connection closed');
    }
  }
}

updateInitialQuantities();