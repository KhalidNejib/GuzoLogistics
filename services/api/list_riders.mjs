import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://admin:uXU8giEQOFR8fmQv@ac-zn7oy01-shard-00-00.olt8jms.mongodb.net:27017,ac-zn7oy01-shard-00-01.olt8jms.mongodb.net:27017,ac-zn7oy01-shard-00-02.olt8jms.mongodb.net:27017/?ssl=true&replicaSet=atlas-z5w8tw-shard-0&authSource=admin&appName=ethio-logistics-cluster';

async function listRiders() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    const users = db.collection('users');

    const riders = await users.find({ role: 'RIDER' }).project({ fullName: 1, email: 1, phoneNumber: 1, onboardingCompleted: 1 }).toArray();
    console.log(`\nRIDER ACCOUNTS (${riders.length} total):`);
    riders.forEach(r => {
      console.log(`  📧 ${r.email}  |  Name: ${r.fullName}  |  Onboarded: ${r.onboardingCompleted}`);
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

listRiders();
