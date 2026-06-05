// MUST be first: overrides RN's broken lazy URL/URLSearchParams globals before
// any other module evaluates (superjson touches `instanceof URL` at request
// time, and reading the lazy getter at all crashes this Hermes build).
import "./lib/url-polyfill";

import { registerRootComponent } from "expo";
import App from "./App";

// Other Hermes polyfills. These run after the module graph evaluates (ES imports
// are hoisted) but before render/network — fine, since nothing needs them during
// module evaluation.
if (typeof globalThis.SharedArrayBuffer === "undefined") {
  globalThis.SharedArrayBuffer = ArrayBuffer;
}
if (typeof globalThis.performance === "undefined") {
  globalThis.performance = { now: () => Date.now() };
} else if (typeof globalThis.performance.now !== "function") {
  globalThis.performance.now = () => Date.now();
}

// Suppress RedBox error overlay in E2E mode (background errors block Maestro).
if (process.env.E2E === "1" && typeof ErrorUtils !== "undefined") {
  ErrorUtils.setGlobalHandler((error) => {
    console.warn("[E2E] Suppressed error:", error?.message || error);
  });
}

// Expo's generated MainActivity runs the "main" component; registerRootComponent
// registers under that name (and sets up the Expo root view).
registerRootComponent(App);
