/**
 * No-op plugin — kept for forward compatibility.
 * expo-modules-core@3.x (SDK 54) does not have Swift concurrency issues.
 * This plugin can be re-activated if upgrading to SDK 55+ in the future.
 */
module.exports = function swiftConcurrencyFix(config) {
  return config;
};
