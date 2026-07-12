import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';

// Load variables from the root .env
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

console.log('Testing Cloudinary with:');
console.log('Cloud Name:', cloudName);
console.log('API Key:', apiKey ? '✅ (Found)' : '❌ (Missing)');

if (!apiKey || !apiSecret || !cloudName) {
  console.error('❌ Error: Missing Cloudinary environment variables.');
  process.exit(1);
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

async function testUpload() {
  try {
    console.log('📤 Attempting a tiny test upload (transparent pixel)...');
    // A 1x1 transparent pixel base64
    const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    
    const res = await cloudinary.uploader.upload(pixel, {
      folder: 'ethio-logistics/test',
      public_id: 'test_pixel_' + Date.now(),
    });

    console.log('✅ SUCCESS! Cloudinary is working.');
    console.log('🔗 File URL:', res.secure_url);
    console.log('📁 Folder "ethio-logistics/test" should now exist in your Media Library.');
  } catch (err: any) {
    console.error('❌ FAILED: Cloudinary upload error.');
    console.error('Reason:', err.message);
    if (err.message.includes('must provide')) {
        console.error('Hint: Check if your .env file is being read correctly.');
    }
  }
}

testUpload();
