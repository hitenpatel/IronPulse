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
if (typeof globalThis.self === "undefined") {
  globalThis.self = globalThis;
}
// superjson (tRPC transformer) runs `value instanceof URL` on every serialized
// value; the Hermes release build has no global URL, so logging in threw
// "Cannot read property 'URL' of undefined". Provide a minimal URL /
// URLSearchParams. tRPC only string-concatenates URLs, so full spec
// compliance isn't required here.
if (typeof globalThis.URL === "undefined") {
  globalThis.URL = function URL(url, base) {
    if (base && typeof url === "string" && !/^https?:/.test(url)) {
      url = String(base).replace(/\/$/, "") + "/" + url.replace(/^\//, "");
    }
    this.href = String(url);
    const m = this.href.match(
      /^(https?:)\/\/([^/:]+)(:\d+)?(\/[^?#]*)?(\?[^#]*)?(#.*)?$/
    );
    this.protocol = (m && m[1]) || "https:";
    this.hostname = (m && m[2]) || "";
    this.port = m && m[3] ? m[3].slice(1) : "";
    this.pathname = (m && m[4]) || "/";
    this.search = (m && m[5]) || "";
    this.hash = (m && m[6]) || "";
    this.host = this.hostname + (this.port ? ":" + this.port : "");
    this.origin = this.protocol + "//" + this.host;
    this.toString = function () {
      return this.href;
    };
  };
}
if (typeof globalThis.URLSearchParams === "undefined") {
  globalThis.URLSearchParams = function URLSearchParams(init) {
    this._p = {};
    if (typeof init === "string") {
      init.replace(/^\?/, "").split("&").forEach((pair) => {
        if (!pair) return;
        const i = pair.indexOf("=");
        const k = decodeURIComponent(i < 0 ? pair : pair.slice(0, i));
        const v = i < 0 ? "" : decodeURIComponent(pair.slice(i + 1));
        this._p[k] = v;
      });
    }
    this.get = (k) => (k in this._p ? this._p[k] : null);
    this.set = (k, v) => { this._p[k] = String(v); };
    this.has = (k) => k in this._p;
    this.toString = () =>
      Object.keys(this._p)
        .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(this._p[k]))
        .join("&");
  };
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
