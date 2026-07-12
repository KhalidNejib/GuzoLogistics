import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

console.log('Script started...');
// Load environment variables from the root .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
console.log('Env loaded from:', path.resolve(process.cwd(), '.env'));

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI is not defined in .env');
  process.exit(1);
}

async function clearData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI!);
    console.log('Connected effectively to host:', mongoose.connection.host);
    console.log('Database Name:', mongoose.connection.name);

    const collections = await mongoose.connection.db!.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));

    const targets = ['orders', 'transactions', 'incidents', 'payouts'];
    
    for (const target of targets) {
      if (collections.find(c => c.name === target)) {
        console.log(`Clearing collection: ${target}...`);
        const result = await mongoose.connection.db!.collection(target).deleteMany({});
        console.log(`Deleted ${result.deletedCount} from ${target}.`);
      } else {
        console.log(`Collection ${target} not found.`);
      }
    }

    if (collections.find(c => c.name === 'riderprofiles')) {
      console.log('Resetting riderprofiles...');
      const result = await mongoose.connection.db!.collection('riderprofiles').updateMany({}, {
        $set: { 
          totalEarnings: 0, 
          currentBalance: 0,
          completedDeliveries: 0,
          activeOrders: []
        }
      });
      console.log(`Reset ${result.modifiedCount} rider profiles.`);
    }

    console.log('\n✅ Successfully cleared all operational data. Ready for a fresh start!');
  } catch (error) {
    console.error('Error clearing data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

clearData();
