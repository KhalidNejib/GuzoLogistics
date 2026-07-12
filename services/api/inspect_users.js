import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './src/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, './.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ethio-logistics';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected!');

  const users = await User.find({}).lean();
  console.log(`Total users in DB: ${users.length}`);
  
  for (const u of users) {
    console.log(`User: ${u.fullName} (${u.role}) - Email: ${u.email} - Disabled: ${u.disabled} - DeletedAt: ${u.deletedAt}`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
