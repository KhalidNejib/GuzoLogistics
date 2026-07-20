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

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      args[key] = value;
    }
  }
  return args;
}

// Patches both the source of truth (Mongo) and Clerk's publicMetadata.role.
async function setRole(db: mongoose.mongo.Db, email: string, role: 'MERCHANT' | 'RIDER' | 'ADMIN') {
  const user = await db.collection('users').findOne({ email }, { projection: { clerkId: 1, role: 1 } });

  if (!user) {
    console.log(`⚠️  Not found: ${email}. Pre-creating placeholder user as ${role}...`);
    await db.collection('users').insertOne({
      email,
      fullName: 'Awaiting Sign-up',
      role,
      phoneNumber: '+251000000000',
      clerkId: `pending_${Math.random().toString(36).substring(7)}`,
      onboardingCompleted: true,
      isApproved: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`✅ Pre-created placeholder user in DB for ${email} as ${role}!`);
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
  const args = parseArgs(process.argv.slice(2));

  if (!args.email || !args.role || (args.role !== 'MERCHANT' && args.role !== 'RIDER' && args.role !== 'ADMIN')) {
    console.error('Usage: fixUserRole.ts --email <email> --role <MERCHANT|RIDER|ADMIN>');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI!);
  console.log('✅ Connected to:', mongoose.connection.name);

  const db = mongoose.connection.db!;

  // 1. Show all users and their roles
  const users = await db.collection('users').find({}, { projection: { _id: 1, email: 1, role: 1, fullName: 1 } }).toArray();
  console.log('\n📋 All users in DB:');
  users.forEach(u => console.log(`  [${u.role}] ID: ${u._id} — ${u.fullName} — ${u.email}`));

  // Fix specific account:
  await setRole(db, args.email, args.role as 'MERCHANT' | 'RIDER' | 'ADMIN');

  await mongoose.disconnect();
  console.log('\n🔌 Disconnected.');
}

fixRoles().catch(err => { console.error(err); process.exit(1); });
