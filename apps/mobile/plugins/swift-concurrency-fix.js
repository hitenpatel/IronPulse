/**
 * Expo config plugin to suppress Swift strict concurrency errors in pod targets.
 * Required because expo-modules-core has Swift concurrency issues with Xcode 16.x.
 */
const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function swiftConcurrencyFix(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const podfilePath = path.join(
        cfg.modRequest.platformProjectRoot,
        "Podfile"
      );
      let podfile = fs.readFileSync(podfilePath, "utf-8");

      const postInstallSnippet = `
    # Fix Swift strict concurrency errors in expo-modules-core (Xcode 16.x)
    # Downgrade concurrency checking and treat errors as warnings
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
        config.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
        config.build_settings['SWIFT_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
        swflags = config.build_settings['OTHER_SWIFT_FLAGS'] || ['$(inherited)']
        unless swflags.to_s.include?('-strict-concurrency')
          config.build_settings['OTHER_SWIFT_FLAGS'] = '$(inherited) -Xfrontend -strict-concurrency=minimal'
        end
      end
    end`;

      // Insert before the last `end` in post_install, or add a new post_install
      if (podfile.includes("post_install do |installer|")) {
        podfile = podfile.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|${postInstallSnippet}`
        );
      } else {
        podfile += `\npost_install do |installer|${postInstallSnippet}\nend\n`;
      }

      fs.writeFileSync(podfilePath, podfile);
      return cfg;
    },
  ]);
};
