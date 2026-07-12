const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://admin:uXU8giEQOFR8fmQv@ac-zn7oy01-shard-00-00.olt8jms.mongodb.net:27017,ac-zn7oy01-shard-00-01.olt8jms.mongodb.net:27017,ac-zn7oy01-shard-00-02.olt8jms.mongodb.net:27017/ethio-logistics?ssl=true&replicaSet=atlas-z5w8tw-shard-0&authSource=admin&appName=ethio-logistics-cluster';

async function main() {
  try {
    console.log('Connecting to Atlas...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected!');

    const db = mongoose.connection.db;
    const users = db.collection('users');
    const profiles = db.collection('riderprofiles');

    // 1. Delete ALL riderprofiles
    const drResult = await profiles.deleteMany({});
    console.log(`Deleted ${drResult.deletedCount} RiderProfiles`);

    // 2. Reset all RIDER users' onboarding status
    const urResult = await users.updateMany(
      { role: 'RIDER' },
      {
        $set: { onboardingCompleted: false },
        $unset: { merchant: "", serviceCity: "" }
      }
    );
    console.log(`Reset onboarding for ${urResult.modifiedCount} rider users`);

    console.log('Done! All riders can now re-register.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
