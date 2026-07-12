const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Disabled withNativeWind temporarily to bypass Windows ESM/Binary bugs.
// We will use the Babel-only path for styling.
module.exports = config;
