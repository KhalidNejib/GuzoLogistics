
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env from root
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function wipe() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not found in environment');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected');

    const collections = ['orders', 'transactions', 'payouts', 'incidents'];
    
    for (const col of collections) {
      try {
        const result = await mongoose.connection.db.collection(col).deleteMany({});
        console.log(`🗑️ Deleted ${result.deletedCount} items from ${col}`);
      } catch (e) {
        console.log(`⚠️ Collection ${col} might not exist yet, skipping.`);
      }
    }

    // Reset User Finance
    const users = await mongoose.connection.db.collection('users').updateMany({}, {
      $set: {
        'finance.balance': 0,
        'finance.cashHeld': 0,
        'finance.codBalance': 0,
        'finance.totalEarned': 0,
        'finance.todayEarnings': 0
      }
    });
    console.log(`💳 Reset finance metrics for ${users.modifiedCount} users`);

    console.log('\n✨ Database Fresh & Clean. Ready for testing.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Wipe failed:', err);
    process.exit(1);
  }
}

wipe();
