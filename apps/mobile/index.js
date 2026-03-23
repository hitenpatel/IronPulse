// Polyfill SharedArrayBuffer for Hermes (required by PowerSync/SQLite)
if (typeof globalThis.SharedArrayBuffer === "undefined") {
  globalThis.SharedArrayBuffer = ArrayBuffer;
}

// Suppress RedBox error overlay in E2E mode (background errors block Maestro)
if (process.env.EXPO_PUBLIC_E2E === "1" && typeof ErrorUtils !== "undefined") {
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    // Log but don't show RedBox
    console.warn("[E2E] Suppressed error:", error?.message || error);
  });
}

import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);
