import mongoose from 'mongoose';
import { mongoConfig } from '../lib/env.js';

// ── Safety guardrails ────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  throw new Error(
    'clearOrders: refused to run in production. Set NODE_ENV to development or test before running this script.'
  );
}
if (!process.argv.includes('--confirm')) {
  console.error('Aborted. This script permanently deletes orders. Pass --confirm to proceed.');
  process.exit(1);
}
// ─────────────────────────────────────────────────────────────────────────────

async function clearOrders() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(mongoConfig.uri || '', {
            connectTimeoutMS: 10000,
            serverSelectionTimeoutMS: 5000,
        });
        const dbName = mongoose.connection.name;
        console.log('⚠️  Database name that WILL be modified:', dbName);
        console.log('Proceeding with order clear in 1 second…');
        await new Promise(r => setTimeout(r, 1000));

        console.log('Clearing Order collection...');
        const result = await mongoose.connection.collection('orders').deleteMany({});
        console.log(`✅ SUCCESS: Deleted ${result.deletedCount} orders.`);
        
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing orders:', error);
        process.exit(1);
    }
}

clearOrders();
