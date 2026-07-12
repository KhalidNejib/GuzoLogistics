import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: 'die8ukixs',
  api_key:     '671229951428588',
  api_secret:  'D2Q68DL3yNyHqUCd4WzLI1lKWTU',
});

console.log('🔑 Config set. Cloud:', cloudinary.config().cloud_name);

const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

try {
  console.log('📤 Uploading 1×1 test pixel ...');
  const res = await cloudinary.uploader.upload(PIXEL, {
    folder:    'ethio-logistics/pod',
    public_id: 'connectivity_test_' + Date.now(),
  });
  console.log('\n✅  SUCCESS!');
  console.log('🔗  URL:', res.secure_url);
  console.log('\nCheck your Cloudinary Media Library → ethio-logistics/pod');
} catch (err) {
  console.error('\n❌  FAILED!');
  console.error('Message:', err.message);
  if (err.message?.includes('cloud_name')) {
    console.error('Hint: cloud_name is wrong. Log in to cloudinary.com → Settings → Account to check it.');
  }
  if (err.message?.includes('401') || err.message?.includes('invalid api')) {
    console.error('Hint: api_key or api_secret is wrong.');
  }
}
