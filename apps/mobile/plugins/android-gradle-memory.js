// Expo config plugin — patches android/gradle.properties to cap Gradle/Kotlin
// memory usage after `expo prebuild` regenerates the native Android project.
//
// Without this, `./gradlew assembleRelease` can consume 6+ GB RSS during
// kotlin compilation, enough to trigger the kernel OOM-killer on 16GB hosts
// and take out neighbour processes (e.g., the claude-tmux service).

const { withGradleProperties } = require("expo/config-plugins");

module.exports = function androidGradleMemory(config) {
  return withGradleProperties(config, (cfg) => {
    const props = cfg.modResults;

    // Helper: set or replace a gradle property
    const setProp = (key, value) => {
      const existing = props.findIndex(
        (p) => p.type === "property" && p.key === key,
      );
      const entry = { type: "property", key, value };
      if (existing >= 0) {
        props[existing] = entry;
      } else {
        props.push(entry);
      }
    };

    // 2 GB heap is enough for this project; kotlin's off-heap native memory
    // pushes total RSS to ~4-5 GB which the OOM killer tolerates on 16GB.
    setProp(
      "org.gradle.jvmargs",
      "-Xmx2048m -XX:MaxMetaspaceSize=512m -XX:+UseG1GC -XX:+HeapDumpOnOutOfMemoryError",
    );
    setProp("org.gradle.workers.max", "2");
    // No resident daemon — each build starts/stops its own JVM so memory is
    // released between invocations.
    setProp("org.gradle.daemon", "false");

    return cfg;
  });
};
