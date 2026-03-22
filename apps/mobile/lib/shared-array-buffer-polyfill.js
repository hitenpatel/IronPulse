// Polyfill SharedArrayBuffer for Hermes engine (Android debug builds)
// Must run before ANY module evaluation — injected via Metro getPolyfills
if (typeof globalThis.SharedArrayBuffer === "undefined") {
  globalThis.SharedArrayBuffer = ArrayBuffer;
}
