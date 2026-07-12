import mongoose from 'mongoose';
import User from '../models/User.js';
import RiderProfile from '../models/RiderProfile.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env');
  process.exit(1);
}

async function clearRiders() {
  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI!);
    console.log('✅ Connected.');

    // 1. Find all riders
    console.log('🔍 Identifying riders...');
    const riders = await User.find({ role: 'RIDER' }).select('_id fullName email clerkId');
    const riderIds = riders.map(r => r._id);
    
    if (riderIds.length === 0) {
      console.log('ℹ️ No riders found in the system.');
      await mongoose.disconnect();
      return;
    }

    console.log(`📋 Found ${riders.length} riders:`);
    riders.forEach(r => console.log(`   - ${r.fullName} (${r.email}) [Clerk: ${r.clerkId}]`));

    // 2. Delete RiderProfiles
    console.log('🗑️ Deleting RiderProfiles...');
    const profileResult = await RiderProfile.deleteMany({ user: { $in: riderIds } });
    console.log(`✅ Deleted ${profileResult.deletedCount} rider profiles.`);

    // 3. Delete Users
    console.log('🗑️ Deleting User documents...');
    const userResult = await User.deleteMany({ role: 'RIDER' });
    console.log(`✅ Deleted ${userResult.deletedCount} user documents.`);

    console.log('✨ System Purge Complete. All riders have been removed.');
    console.log('⚠️ IMPORTANT: You must also delete these users from the Clerk Dashboard if you want to reuse their emails for registration testing.');

  } catch (error) {
    console.error('❌ Error during purge:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}

clearRiders();
