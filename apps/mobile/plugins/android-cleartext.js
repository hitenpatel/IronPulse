const { withAndroidManifest } = require("expo/config-plugins");

module.exports = function androidCleartext(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (app) {
      app.$["android:usesCleartextTraffic"] = "true";
    }
    return cfg;
  });
};
