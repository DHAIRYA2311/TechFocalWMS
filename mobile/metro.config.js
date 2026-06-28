const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Shim Node.js core modules util and assert to prevent bundling failures on Android/iOS
config.resolver.extraNodeModules = {
  util: path.resolve(__dirname, 'src/shims/empty.js'),
  assert: path.resolve(__dirname, 'src/shims/empty.js'),
};

module.exports = config;
