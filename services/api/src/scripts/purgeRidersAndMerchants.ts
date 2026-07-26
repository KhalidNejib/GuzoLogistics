import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment');
  process.exit(1);
}

const ADMIN_EMAIL = 'nahkha36@gmail.com';

async function purgeRidersAndMerchants() {
  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI!);
    console.log('✅ Connected to MongoDB:', mongoose.connection.host);
    console.log('⚠️  Database:', mongoose.connection.name);

    // 1. Find the admin user to preserve
    const adminUser = await mongoose.connection.db!.collection('users').findOne({
      email: { $regex: new RegExp(`^${ADMIN_EMAIL}$`, 'i') }
    });

    if (!adminUser) {
      console.warn(`⚠️ Warning: Admin user with email "${ADMIN_EMAIL}" was not found!`);
      console.log('Checking all users in database:');
      const allUsers = await mongoose.connection.db!.collection('users').find({}).toArray();
      allUsers.forEach(u => console.log(` - ${u.fullName} | ${u.email} | ${u.role}`));
    } else {
      console.log(`🛡️ Preserving Admin Account: ${adminUser.fullName} (${adminUser.email}) [ID: ${adminUser._id}]`);
    }

    // 2. Identify users to delete
    const usersToDelete = await mongoose.connection.db!.collection('users').find({
      email: { $not: { $regex: new RegExp(`^${ADMIN_EMAIL}$`, 'i') } }
    }).toArray();

    console.log(`\n📋 Found ${usersToDelete.length} users to delete:`);
    usersToDelete.forEach(u => console.log(`   ❌ [${u.role}] ${u.fullName} (${u.email})`));

    const userIdsToDelete = usersToDelete.map(u => u._id);

    if (userIdsToDelete.length > 0) {
      // Delete rider profiles
      const profileRes = await mongoose.connection.db!.collection('riderprofiles').deleteMany({
        user: { $in: userIdsToDelete }
      });
      console.log(`\n🗑️ Deleted ${profileRes.deletedCount} rider profiles.`);

      // Delete associated orders, incidents, payouts, transactions
      const ordersRes = await mongoose.connection.db!.collection('orders').deleteMany({
        $or: [{ merchant: { $in: userIdsToDelete } }, { rider: { $in: userIdsToDelete } }]
      });
      console.log(`🗑️ Deleted ${ordersRes.deletedCount} orders.`);

      const incidentsRes = await mongoose.connection.db!.collection('incidents').deleteMany({
        $or: [{ reporter: { $in: userIdsToDelete } }, { rider: { $in: userIdsToDelete } }]
      });
      console.log(`🗑️ Deleted ${incidentsRes.deletedCount} incidents.`);

      const transactionsRes = await mongoose.connection.db!.collection('transactions').deleteMany({
        user: { $in: userIdsToDelete }
      });
      console.log(`🗑️ Deleted ${transactionsRes.deletedCount} transactions.`);

      const payoutsRes = await mongoose.connection.db!.collection('payouts').deleteMany({
        user: { $in: userIdsToDelete }
      });
      console.log(`🗑️ Deleted ${payoutsRes.deletedCount} payouts.`);

      // Delete users
      const deleteUsersRes = await mongoose.connection.db!.collection('users').deleteMany({
        _id: { $in: userIdsToDelete }
      });
      console.log(`\n✅ Successfully deleted ${deleteUsersRes.deletedCount} user accounts (riders & merchants).`);
    } else {
      console.log('ℹ️ No non-admin users found to delete.');
    }

    console.log('\n✨ Purge complete! Only admin account remains.');

  } catch (error) {
    console.error('❌ Error during purge:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}

purgeRidersAndMerchants();
