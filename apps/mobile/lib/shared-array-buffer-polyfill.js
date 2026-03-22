// Polyfill SharedArrayBuffer and Atomics for Hermes engine (Android debug builds)
// Runs after RN default polyfills via Metro getPolyfills

if (typeof globalThis.SharedArrayBuffer === "undefined") {
  globalThis.SharedArrayBuffer = ArrayBuffer;
}

if (typeof globalThis.Atomics === "undefined") {
  globalThis.Atomics = {
    add: () => 0, and: () => 0, compareExchange: () => 0, exchange: () => 0,
    isLockFree: () => true, load: () => 0, notify: () => 0, or: () => 0,
    store: (ta, i, val) => { ta[i] = val; return val; }, sub: () => 0,
    wait: () => "ok", waitAsync: () => ({ async: false, value: "ok" }), xor: () => 0,
    get: (ta, i) => ta[i],
  };
}

// Ensure URL is available (some Hermes builds don't have it)
if (typeof globalThis.URL === "undefined") {
  try {
    // React Native provides URL in its Blob module
    const { URL, URLSearchParams } = require("react-native/Libraries/Blob/URL");
    if (URL) globalThis.URL = URL;
    if (URLSearchParams && typeof globalThis.URLSearchParams === "undefined") {
      globalThis.URLSearchParams = URLSearchParams;
    }
  } catch (e) {
    // Fallback: minimal URL implementation for tRPC httpBatchLink
    globalThis.URL = class URL {
      constructor(url, base) {
        if (base && !url.startsWith("http")) {
          url = base.replace(/\/$/, "") + "/" + url.replace(/^\//, "");
        }
        this.href = url;
        const match = url.match(/^(https?:)\/\/([^/:]+)(:\d+)?(\/[^?#]*)?(\?[^#]*)?(#.*)?$/);
        this.protocol = match?.[1] || "https:";
        this.hostname = match?.[2] || "";
        this.port = match?.[3]?.slice(1) || "";
        this.pathname = match?.[4] || "/";
        this.search = match?.[5] || "";
        this.hash = match?.[6] || "";
        this.host = this.hostname + (this.port ? ":" + this.port : "");
        this.origin = this.protocol + "//" + this.host;
        this.searchParams = new URLSearchParams(this.search.slice(1));
      }
      toString() { return this.href; }
    };
  }
}
