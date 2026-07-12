import mongoose from 'mongoose';
import { mongoConfig } from '../lib/env.js';
import Order from '../models/Order.js';

async function clearOrders() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(mongoConfig.uri || '', {
            connectTimeoutMS: 10000,
            serverSelectionTimeoutMS: 5000,
        });
        
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
