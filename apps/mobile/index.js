// Polyfill SharedArrayBuffer for Hermes (required by PowerSync/SQLite)
if (typeof globalThis.SharedArrayBuffer === "undefined") {
  globalThis.SharedArrayBuffer = ArrayBuffer;
}

// Polyfill performance.now for Hermes (required by React internals)
if (typeof globalThis.performance === "undefined") {
  globalThis.performance = { now: () => Date.now() };
} else if (typeof globalThis.performance.now !== "function") {
  globalThis.performance.now = () => Date.now();
}

// Suppress RedBox error overlay in E2E mode (background errors block Maestro)
if (process.env.E2E === "1" && typeof ErrorUtils !== "undefined") {
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    // Log but don't show RedBox
    console.warn("[E2E] Suppressed error:", error?.message || error);
  });
}

import { registerRootComponent } from "expo";
import App from "./App";

// Expo's generated MainActivity runs the "main" component; registerRootComponent
// registers under that name (and sets up the Expo root view).
registerRootComponent(App);
