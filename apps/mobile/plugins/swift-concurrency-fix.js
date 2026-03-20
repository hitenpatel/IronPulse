/**
 * No-op plugin — kept as a safety net but not needed with Expo SDK 54.
 * Expo SDK 55 + Xcode 16.x had Swift strict concurrency errors in
 * expo-modules-core; SDK 54 does not exhibit this issue.
 */
module.exports = function swiftConcurrencyFix(config) {
  return config;
};
