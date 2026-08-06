const path = require('path');
const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// Shim Node.js core modules util and assert to prevent bundling failures on Android/iOS
config.resolver.extraNodeModules = {
  util: path.resolve(__dirname, 'src/shims/empty.js'),
  assert: path.resolve(__dirname, 'src/shims/empty.js'),
};

module.exports = config;