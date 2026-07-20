/**
 * Usage:
 *   pnpm exec tsx src/scripts/checkUser.ts --email someone@example.com
 *   pnpm exec tsx src/scripts/checkUser.ts --recent 5
 *
 * Replaces the old services/api/scratch/check-user.ts and check-recent-users.ts,
 * which had a hardcoded email and a hardcoded live MongoDB Atlas admin
 * credential in source. This version takes its target as a CLI argument and
 * reads MONGODB_URI from the environment, matching every other script in
 * this directory.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

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

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.email && !args.recent) {
    console.error('Usage: checkUser.ts --email <email>  |  --recent <n>');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI!);
  const db = mongoose.connection.db;
  if (!db) {
    console.error('Failed to acquire DB handle');
    process.exit(1);
  }

  try {
    if (args.email) {
      const user = await db.collection('users').findOne({ email: args.email });
      console.log(user ? JSON.stringify(user, null, 2) : `No user found for ${args.email}`);
    } else {
      const n = Number(args.recent) || 5;
      const users = await db
        .collection('users')
        .find({})
        .sort({ createdAt: -1 })
        .limit(n)
        .toArray();
      console.log(JSON.stringify(users, null, 2));
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
