import mongoose from 'mongoose';

const MONGODB_URI = "mongodb://admin:uXU8giEQOFR8fmQv@ac-zn7oy01-shard-00-00.olt8jms.mongodb.net:27017,ac-zn7oy01-shard-00-01.olt8jms.mongodb.net:27017,ac-zn7oy01-shard-00-02.olt8jms.mongodb.net:27017/?ssl=true&replicaSet=atlas-z5w8tw-shard-0&authSource=admin&appName=ethio-logistics-cluster";

async function promote() {
    const email = 'kalid.ugr-9284-16@aau.edu.et';
    console.log(`Connecting to MongoDB Atlas...`);
    
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        const db = mongoose.connection.db;
        if (!db) {
            console.log('DB not found');
            process.exit(1);
        }

        const user = await db.collection('users').findOne({ email });
        
        if (!user) {
            console.log(`❌ User with email ${email} not found.`);
            process.exit(1);
        }

        console.log(`Found user: ${user.fullName} (Current Role: ${user.role})`);
        
        const result = await db.collection('users').updateOne(
            { email },
            { $set: { role: 'RIDER' } }
        );

        if (result.modifiedCount > 0) {
            console.log(`✅ SUCCESS: User ${user.fullName} has been promoted to RIDER.`);
        } else {
            console.log('User already had RIDER role or update failed.');
        }
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

promote();
