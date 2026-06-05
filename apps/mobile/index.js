import { registerRootComponent } from "expo";
import App from "./App";

// Runtime polyfills. These run AFTER the module graph is evaluated (ES imports
// are hoisted) but before the app renders or makes any network call. They must
// NOT run during module evaluation: defining `self` early makes some libraries
// take a browser/worker code path and crash at import time.
if (typeof globalThis.SharedArrayBuffer === "undefined") {
  globalThis.SharedArrayBuffer = ArrayBuffer;
}
if (typeof globalThis.performance === "undefined") {
  globalThis.performance = { now: () => Date.now() };
} else if (typeof globalThis.performance.now !== "function") {
  globalThis.performance.now = () => Date.now();
}
// tRPC's fetch link reads `self.URL`; React Native provides URL/URLSearchParams
// on globalThis but not `self`.
if (typeof globalThis.self === "undefined") {
  globalThis.self = globalThis;
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
