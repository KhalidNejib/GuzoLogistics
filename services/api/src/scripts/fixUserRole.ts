import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { createClerkClient } from '@clerk/express';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
if (!CLERK_SECRET_KEY) { console.error('CLERK_SECRET_KEY not set'); process.exit(1); }
const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY });

// Patches both the source of truth (Mongo) and Clerk's publicMetadata.role.
// Previously this script only wrote to Mongo, which left Clerk's metadata
// unset/stale — and requireUser's auto-sync in auth.ts treats a missing
// Clerk role hint as "default to RIDER", so any promoted merchant whose
// Clerk profile still had a placeholder name would get silently demoted
// back to RIDER on their very next authenticated request. Writing to both
// stores means that can't happen again for accounts fixed through here.
async function setRole(db: mongoose.mongo.Db, email: string, role: 'MERCHANT' | 'RIDER') {
  const user = await db.collection('users').findOne({ email }, { projection: { clerkId: 1, role: 1 } });

  if (!user) {
    console.log(`⚠️  Not found: ${email}`);
    return;
  }

  const result = await db.collection('users').updateOne({ email }, { $set: { role } });

  if (user.clerkId) {
    try {
      await clerk.users.updateUserMetadata(user.clerkId, { publicMetadata: { role } });
      console.log(`  ↳ Clerk publicMetadata.role synced → ${role}`);
    } catch (err: any) {
      console.error(`  ↳ ⚠️ Failed to sync Clerk metadata for ${email}: ${err.message}`);
    }
  } else {
    console.warn(`  ↳ ⚠️ No clerkId on record for ${email} — Clerk metadata NOT updated`);
  }

  if (result.modifiedCount > 0) {
    console.log(`✅ Fixed: ${email} → ${role}`);
  } else if (user.role === role) {
    console.log(`ℹ️  Already ${role}: ${email}`);
  }
}

async function fixRoles() {
  await mongoose.connect(MONGODB_URI!);
  console.log('✅ Connected to:', mongoose.connection.name);

  const db = mongoose.connection.db!;

  // 1. Show all users and their roles
  const users = await db.collection('users').find({}, { projection: { _id: 1, email: 1, role: 1, fullName: 1 } }).toArray();
  console.log('\n📋 All users in DB:');
  users.forEach(u => console.log(`  [${u.role}] ID: ${u._id} — ${u.fullName} — ${u.email}`));

  // Fix specific accounts: RIDER → MERCHANT
  const emailsToMerchant = ['anti546784@gmail.com', 'tesnimnejib0@gmail.com'];
  for (const email of emailsToMerchant) {
    await setRole(db, email, 'MERCHANT');
  }

  // Fix these specific accounts: MERCHANT → RIDER
  const emailsToRider = [
    'a28288962@gmail.com',
    'anti43254@gmail.com',
  ];

  for (const email of emailsToRider) {
    await setRole(db, email, 'RIDER');
  }

  await mongoose.disconnect();
  console.log('\n🔌 Disconnected.');
}

fixRoles().catch(err => { console.error(err); process.exit(1); });
