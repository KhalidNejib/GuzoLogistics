import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

console.log('Listing all databases...');
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const MONGODB_URI = process.env.MONGODB_URI;

async function listDBs() {
  try {
    await mongoose.connect(MONGODB_URI!);
    const admin = mongoose.connection.db.admin();
    const dbs = await admin.listDatabases();
    console.log('Databases on this cluster:');
    dbs.databases.forEach(db => console.log(`- ${db.name}`));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

listDBs();
