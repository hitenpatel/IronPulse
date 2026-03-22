// Polyfill SharedArrayBuffer for Hermes (required by PowerSync/SQLite)
// Hermes on Android debug builds doesn't support SharedArrayBuffer natively
if (typeof globalThis.SharedArrayBuffer === "undefined") {
  globalThis.SharedArrayBuffer = ArrayBuffer;
}

import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);
