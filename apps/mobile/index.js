// Polyfill SharedArrayBuffer for Hermes (required by PowerSync/SQLite)
if (typeof globalThis.SharedArrayBuffer === "undefined") {
  globalThis.SharedArrayBuffer = ArrayBuffer;
}

import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);
