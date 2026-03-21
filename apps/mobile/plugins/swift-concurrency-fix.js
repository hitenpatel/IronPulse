/**
 * Expo config plugin to exclude react-native-worklets from iOS native build.
 * The Babel plugin from react-native-worklets is needed, but the native code
 * conflicts with react-native-reanimated which bundles its own worklets.
 */
const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function excludeWorkletsPod(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const podfilePath = path.join(
        cfg.modRequest.platformProjectRoot,
        "Podfile"
      );

      if (!fs.existsSync(podfilePath)) return cfg;

      let podfile = fs.readFileSync(podfilePath, "utf-8");

      // Add pre_install hook to remove RNWorklets pod (native code conflicts with reanimated)
      const preInstallSnippet = `
pre_install do |installer|
  installer.pod_targets.each do |pod|
    if pod.name == 'RNWorklets' || pod.name == 'react-native-worklets'
      def pod.build_type; Pod::BuildType.static_library; end
      pod.specs.each { |s| s.source_files = '' }
    end
  end
end
`;

      if (!podfile.includes("RNWorklets")) {
        podfile = preInstallSnippet + podfile;
      }

      fs.writeFileSync(podfilePath, podfile);
      return cfg;
    },
  ]);
};
