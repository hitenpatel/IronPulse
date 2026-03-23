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

// Ensure 'self' exists (some libraries like tRPC check self.URL)
if (typeof globalThis.self === "undefined") {
  globalThis.self = globalThis;
}

// Pure JS URL polyfill (no require calls — safe for polyfill phase)
if (typeof globalThis.URL === "undefined") {
  globalThis.URL = function URL(url, base) {
    if (base && typeof url === "string" && !url.match(/^https?:/)) {
      url = String(base).replace(/\/$/, "") + "/" + url.replace(/^\//, "");
    }
    this.href = String(url);
    var m = this.href.match(/^(https?:)\/\/([^/:]+)(:\d+)?(\/[^?#]*)?(\?[^#]*)?(#.*)?$/);
    this.protocol = m && m[1] || "https:";
    this.hostname = m && m[2] || "";
    this.port = m && m[3] ? m[3].slice(1) : "";
    this.pathname = m && m[4] || "/";
    this.search = m && m[5] || "";
    this.hash = m && m[6] || "";
    this.host = this.hostname + (this.port ? ":" + this.port : "");
    this.origin = this.protocol + "//" + this.host;
    this.toString = function() { return this.href; };
  };
}

// Also set on global/self if they exist (some libraries check window.URL or self.URL)
if (typeof global !== "undefined" && typeof global.URL === "undefined") {
  global.URL = globalThis.URL;
}

if (typeof globalThis.URLSearchParams === "undefined") {
  globalThis.URLSearchParams = function URLSearchParams(init) {
    this._params = {};
    if (typeof init === "string") {
      init.split("&").forEach(function(pair) {
        var parts = pair.split("=");
        if (parts[0]) this._params[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1] || "");
      }.bind(this));
    }
    this.get = function(key) { return this._params[key] || null; };
    this.has = function(key) { return key in this._params; };
    this.toString = function() {
      return Object.keys(this._params).map(function(k) {
        return encodeURIComponent(k) + "=" + encodeURIComponent(this._params[k]);
      }.bind(this)).join("&");
    };
  };
}
