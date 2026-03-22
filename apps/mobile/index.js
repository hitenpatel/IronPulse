// Polyfill SharedArrayBuffer for Hermes (required by PowerSync/SQLite)
if (typeof globalThis.SharedArrayBuffer === "undefined") {
  globalThis.SharedArrayBuffer = ArrayBuffer;
}

// Polyfill URL for Hermes if not available (required by tRPC httpBatchLink)
if (typeof globalThis.URL === "undefined") {
  try {
    const blob = require("react-native/Libraries/Blob/URL");
    if (blob.URL) globalThis.URL = blob.URL;
    if (blob.URLSearchParams) globalThis.URLSearchParams = blob.URLSearchParams;
  } catch (e) {
    // Minimal URL fallback
    globalThis.URL = function URL(url) {
      this.href = url;
      this.toString = () => url;
    };
  }
}

import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);
