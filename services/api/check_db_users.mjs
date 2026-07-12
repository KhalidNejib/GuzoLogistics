import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://admin:uXU8giEQOFR8fmQv@ac-zn7oy01-shard-00-00.olt8jms.mongodb.net:27017,ac-zn7oy01-shard-00-01.olt8jms.mongodb.net:27017,ac-zn7oy01-shard-00-02.olt8jms.mongodb.net:27017/?ssl=true&replicaSet=atlas-z5w8tw-shard-0&authSource=admin&appName=ethio-logistics-cluster';

async function checkUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB Atlas');

    // Mongoose will use the collection named 'users' by default if we define the model
    const userSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model('User', userSchema);

    const merchants = await User.find({ role: 'merchant' }).lean();
    const riders = await User.find({ role: 'rider' }).lean();

    console.log('\n--- MERCHANT USERS ---');
    if (merchants.length === 0) console.log('No merchants found.');
    merchants.forEach(m => {
      console.log(`Name: ${m.fullName || m.firstName || 'N/A'}, Email: ${m.email}, ID: ${m.clerkId || m._id}`);
    });

    console.log('\n--- RIDER USERS ---');
    if (riders.length === 0) console.log('No riders found.');
    riders.forEach(r => {
        console.log(`Name: ${r.fullName || r.firstName || 'N/A'}, Email: ${r.email}, ID: ${r.clerkId || r._id}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUsers();
