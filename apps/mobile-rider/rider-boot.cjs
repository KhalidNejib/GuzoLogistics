const path = require('path');
const fs = require('fs');

// 1. Polyfill missing Node 20 features for Node 18
if (!Array.prototype.toReversed) {
  console.log('💉 Node 18 Detected: Injecting toReversed() polyfill...');
  Array.prototype.toReversed = function() {
    return [...this].reverse();
  };
}

// 2. Force legacy conditions
process.env.EXPO_USE_METRO_ESM = '0';
process.env.NODE_OPTIONS = '--no-warnings';

console.log('🚀 Senior Agent Bootloader v2.0 Starting...');
console.log('📡 Bypassing Node 20 bugs on Node 18...');

const expoCliPath = path.resolve(__dirname, 'node_modules/expo/bin/cli');

if (!fs.existsSync(expoCliPath)) {
  console.error('❌ Error: Local expo binary not found.');
  process.exit(1);
}

process.argv.push('start', '-c');

try {
  require(expoCliPath);
} catch (err) {
  console.error('❌ Bootloader Error:', err.message);
}
