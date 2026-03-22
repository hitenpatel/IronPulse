// Polyfill SharedArrayBuffer and Atomics for Hermes engine (Android debug builds)
// Must run before ANY module evaluation — injected via Metro getPolyfills
if (typeof globalThis.SharedArrayBuffer === "undefined") {
  globalThis.SharedArrayBuffer = ArrayBuffer;
}

if (typeof globalThis.Atomics === "undefined") {
  globalThis.Atomics = {
    add: function () { return 0; },
    and: function () { return 0; },
    compareExchange: function () { return 0; },
    exchange: function () { return 0; },
    isLockFree: function () { return true; },
    load: function () { return 0; },
    notify: function () { return 0; },
    or: function () { return 0; },
    store: function (ta, i, val) { ta[i] = val; return val; },
    sub: function () { return 0; },
    wait: function () { return "ok"; },
    waitAsync: function () { return { async: false, value: "ok" }; },
    xor: function () { return 0; },
    get: function (ta, i) { return ta[i]; },
  };
}
