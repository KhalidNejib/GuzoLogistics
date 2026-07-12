import mongoose from 'mongoose';
import { mongoConfig } from '@ethio-logistics/env';

async function removeRider() {
  try {
    console.log('Connecting to:', mongoConfig.uri);
    await mongoose.connect(mongoConfig.uri);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    const profilesCollection = db.collection('riderprofiles');

    // Find user by name (flexible search)
    const users = await usersCollection.find({ fullName: /KALID/i }).toArray();
    console.log(`Found ${users.length} users matching "KALID"`);

    for (const user of users) {
      console.log(`Resetting rider: ${user.fullName} (${user._id})`);
      
      // Remove RiderProfile
      const profileResult = await profilesCollection.deleteMany({ user: user._id });
      console.log(`- RiderProfile deleted: ${profileResult.deletedCount}`);

      // Reset User onboarding status
      await usersCollection.updateOne({ _id: user._id }, { 
         $set: { 
            onboardingCompleted: false,
            role: 'RIDER'
         },
         $unset: { merchant: 1, serviceCity: 1 }
      });
      console.log(`- User ${user.fullName} onboarding status reset.`);
    }

    await mongoose.disconnect();
    console.log('Disconnected.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

removeRider();
