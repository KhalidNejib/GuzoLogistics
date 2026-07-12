import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://admin:uXU8giEQOFR8fmQv@ac-zn7oy01-shard-00-00.olt8jms.mongodb.net:27017,ac-zn7oy01-shard-00-01.olt8jms.mongodb.net:27017,ac-zn7oy01-shard-00-02.olt8jms.mongodb.net:27017/?ssl=true&replicaSet=atlas-z5w8tw-shard-0&authSource=admin&appName=ethio-logistics-cluster';

async function listUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    const users = await db.collection('users').find({}).toArray();

    console.log('\n--- ALL REGISTERED USERS ---');
    users.forEach(u => {
      console.log(`Role: ${u.role || 'NONE'}, Name: ${u.fullName || u.firstName || 'N/A'}, Email: ${u.email}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listUsers();
