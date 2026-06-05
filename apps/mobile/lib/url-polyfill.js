// React Native 0.81 registers `URL`/`URLSearchParams` as lazy globals via
// polyfillGlobal(() => require('../Blob/URL')). That Blob/URL module is broken
// in this Hermes release build — invoking the lazy getter throws
// "Cannot read property 'get' of undefined". superjson (the tRPC transformer)
// runs `value instanceof URL` on every payload, which fires that getter and
// breaks login; merely reading `typeof globalThis.URL` also fires it.
//
// So we OVERRIDE the lazy globals with our own implementations via
// Object.defineProperty (value descriptor) — this replaces the property without
// invoking the broken getter. This module MUST be the first import in index.js
// so our globals exist before any other module evaluates.
//
// tRPC only string-concatenates URLs and superjson only needs `instanceof URL`
// to be a valid constructor, so full WHATWG spec compliance is not required.

function MinimalURL(url, base) {
  if (base && typeof url === "string" && !/^[a-z]+:\/\//i.test(url)) {
    url = String(base).replace(/\/$/, "") + "/" + url.replace(/^\//, "");
  }
  this.href = String(url);
  const m = this.href.match(
    /^([a-z]+:)\/\/([^/:?#]+)(:\d+)?(\/[^?#]*)?(\?[^#]*)?(#.*)?$/i
  );
  this.protocol = (m && m[1]) || "https:";
  this.hostname = (m && m[2]) || "";
  this.port = m && m[3] ? m[3].slice(1) : "";
  this.pathname = (m && m[4]) || "/";
  this.search = (m && m[5]) || "";
  this.hash = (m && m[6]) || "";
  this.host = this.hostname + (this.port ? ":" + this.port : "");
  this.origin = this.protocol + "//" + this.host;
}
MinimalURL.prototype.toString = function () {
  return this.href;
};

function MinimalURLSearchParams(init) {
  this._p = {};
  if (typeof init === "string") {
    init
      .replace(/^\?/, "")
      .split("&")
      .forEach((pair) => {
        if (!pair) return;
        const i = pair.indexOf("=");
        const k = decodeURIComponent(i < 0 ? pair : pair.slice(0, i));
        const v = i < 0 ? "" : decodeURIComponent(pair.slice(i + 1));
        this._p[k] = v;
      });
  }
}
MinimalURLSearchParams.prototype.get = function (k) {
  return k in this._p ? this._p[k] : null;
};
MinimalURLSearchParams.prototype.set = function (k, v) {
  this._p[k] = String(v);
};
MinimalURLSearchParams.prototype.has = function (k) {
  return k in this._p;
};
MinimalURLSearchParams.prototype.append = function (k, v) {
  this._p[k] = String(v);
};
MinimalURLSearchParams.prototype.toString = function () {
  return Object.keys(this._p)
    .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(this._p[k]))
    .join("&");
};

function install(name, value) {
  try {
    Object.defineProperty(globalThis, name, {
      value,
      writable: true,
      configurable: true,
      enumerable: false,
    });
  } catch (e) {
    // ignore — if it can't be redefined we leave RN's version in place
  }
}

install("URL", MinimalURL);
install("URLSearchParams", MinimalURLSearchParams);
