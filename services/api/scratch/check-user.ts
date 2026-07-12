import mongoose from 'mongoose';

const MONGODB_URI = "mongodb://admin:uXU8giEQOFR8fmQv@ac-zn7oy01-shard-00-00.olt8jms.mongodb.net:27017,ac-zn7oy01-shard-00-01.olt8jms.mongodb.net:27017,ac-zn7oy01-shard-00-02.olt8jms.mongodb.net:27017/?ssl=true&replicaSet=atlas-z5w8tw-shard-0&authSource=admin&appName=ethio-logistics-cluster";

async function check() {
    const email = 'kalid.ugr-9284-16@aau.edu.et';
    try {
        await mongoose.connect(MONGODB_URI);
        const db = mongoose.connection.db;
        if (!db) { process.exit(1); }

        const user = await db.collection('users').findOne({ email });
        console.log(JSON.stringify(user, null, 2));
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
