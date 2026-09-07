/**
 * Runtime server selection — lets a single published build point at any
 * self-hosted Zor instance instead of baking `API_URL` in at bundle time.
 *
 * Consumers (`lib/trpc.ts`, `lib/powersync.ts`, screens) must call
 * `getApiUrl()` at request time rather than caching the value themselves —
 * the URL can change while the app is running (see `setApiUrl` /
 * `onServerUrlChange`).
 *
 * `hydrateServerUrl()` must be awaited once, before anything reads
 * `getApiUrl()` in anger — see the gate in `App.tsx` (`RootNavigator`,
 * before the `needsAuth` branch) and the `await hydrateServerUrl()` at the
 * top of `AuthProvider`'s session-restore effect in `lib/auth.tsx`.
 */
import * as SecureStore from "@/lib/secure-store";
import { Config } from "./config";

export const SERVER_URL_KEY = "server-url";
// Pre-multi-server installs only ever wrote this key — its presence with no
// `server-url` means "existing cloud user", not "first launch".
const LEGACY_AUTH_TOKEN_KEY = "auth-token";

const VALIDATION_TIMEOUT_MS = 10000;

let cachedUrl: string | null = null;
let hydrated = false;
let hydrationPromise: Promise<string | null> | null = null;

const listeners = new Set<(url: string) => void>();

/**
 * Strips whitespace/trailing slashes and prefixes `https://` when the input
 * has no scheme at all (AC: "missing scheme auto-prefixes https").
 */
export function normalizeServerUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Synchronous read of the currently active server URL. Safe to call from
 * anywhere once `hydrateServerUrl()` has resolved at least once — before
 * that it returns the cloud default, which is the correct behaviour for the
 * brief window during app boot.
 */
export function getApiUrl(): string {
  return cachedUrl ?? Config.DEFAULT_API_URL;
}

/**
 * True once a server URL is known (either restored from SecureStore or set
 * this session). False means the app needs to show the first-launch
 * server picker.
 */
export function hasServerUrl(): boolean {
  return cachedUrl !== null;
}

/**
 * Loads the persisted server URL from SecureStore into the in-memory cache.
 * Idempotent and safe to call from multiple places (auth restore, the
 * App.tsx gate) — only the first call touches SecureStore, later calls
 * resolve immediately from the cached promise.
 *
 * Returns the resolved URL, or `null` if this is a genuine first launch
 * (no stored server URL and no legacy auth token) and the picker should be
 * shown.
 *
 * Backwards compat: an install that already has `auth-token` but predates
 * multi-server support has no `server-url` — default it to the cloud URL
 * and persist that choice so future launches don't need this fallback.
 */
export function hydrateServerUrl(): Promise<string | null> {
  if (hydrated) return Promise.resolve(cachedUrl);
  if (hydrationPromise) return hydrationPromise;

  hydrationPromise = (async () => {
    try {
      const stored = await SecureStore.getItemAsync(SERVER_URL_KEY);
      if (stored) {
        cachedUrl = stored;
        return cachedUrl;
      }

      const legacyToken = await SecureStore.getItemAsync(LEGACY_AUTH_TOKEN_KEY);
      if (legacyToken) {
        cachedUrl = Config.DEFAULT_API_URL;
        try {
          await SecureStore.setItemAsync(SERVER_URL_KEY, cachedUrl);
        } catch {
          // Persisting the fallback failed — non-fatal, we'll just re-derive
          // it the same way next launch.
        }
        return cachedUrl;
      }
    } catch {
      // SecureStore read failed — fall through to "needs picker" rather
      // than silently assuming a server, so we never guess wrong.
    } finally {
      hydrated = true;
    }
    return cachedUrl; // still null => first launch, caller shows the picker
  })();

  return hydrationPromise;
}

/**
 * Persists and activates a new server URL. Notifies subscribers (PowerSync
 * reinit, App.tsx's picker gate) synchronously after the write succeeds.
 */
export async function setApiUrl(rawUrl: string): Promise<string> {
  const normalized = normalizeServerUrl(rawUrl);
  await SecureStore.setItemAsync(SERVER_URL_KEY, normalized);
  cachedUrl = normalized;
  hydrated = true;
  for (const listener of listeners) listener(normalized);
  return normalized;
}

/** Subscribe to server URL changes. Returns an unsubscribe function. */
export function onServerUrlChange(listener: (url: string) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ServerValidationErrorReason =
  | "unreachable"
  | "tls"
  | "invalid-response"
  | "timeout";

export interface ServerValidationSuccess {
  ok: true;
  url: string;
}

export interface ServerValidationFailure {
  ok: false;
  reason: ServerValidationErrorReason;
  message: string;
}

export type ServerValidationResult =
  | ServerValidationSuccess
  | ServerValidationFailure;

const MESSAGES: Record<ServerValidationErrorReason, string> = {
  unreachable: "Couldn't reach that address",
  tls: "TLS error — for local dev, set up Caddy with a real cert",
  "invalid-response": "Doesn't look like a Zor server",
  timeout: "Server didn't respond — check the URL and try again",
};

function failure(reason: ServerValidationErrorReason): ServerValidationFailure {
  return { ok: false, reason, message: MESSAGES[reason] };
}

/**
 * React Native's fetch (bridged onto OkHttp / NSURLSession) doesn't expose
 * structured TLS error codes the way Node does. Both platforms do bubble the
 * native exception's class name / description into the JS Error message
 * (e.g. Android's `javax.net.ssl.SSLHandshakeException`, iOS's
 * "certificate" / "server certificate" wording, and Node's `err.code` in
 * tests), so we classify by substring as a best effort. This is inherently
 * heuristic — verified against real self-signed-cert servers on-device is
 * out of scope here.
 */
function isTlsError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const code = (err as NodeJS.ErrnoException).code;
  if (code && /^(CERT_|ERR_TLS|DEPTH_ZERO_SELF_SIGNED_CERT|UNABLE_TO_VERIFY_LEAF_SIGNATURE|SELF_SIGNED_CERT_IN_CHAIN)/i.test(code)) {
    return true;
  }
  const msg = err.message.toLowerCase();
  return (
    msg.includes("certificate") ||
    msg.includes("ssl") ||
    msg.includes("tls") ||
    msg.includes("cert_") ||
    msg.includes("secure connection")
  );
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

function hasHealthShape(body: unknown): boolean {
  return (
    typeof body === "object" &&
    body !== null &&
    "status" in body &&
    typeof (body as { status: unknown }).status === "string"
  );
}

/**
 * Validates a candidate server URL by calling `GET <url>/api/health` with a
 * 10s timeout. Never throws — every failure mode maps to a
 * `ServerValidationFailure` with a distinct `reason` and a ready-to-display
 * `message`.
 */
export async function validateServerUrl(rawUrl: string): Promise<ServerValidationResult> {
  const url = normalizeServerUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT_MS);

  try {
    let response: Response;
    try {
      // `signal` is typed `as any` here: this project's tsconfig has no
      // "dom" lib, so `fetch`'s ambient declaration and `AbortController`'s
      // come from different @types packages with structurally similar but
      // nominally distinct `AbortSignal` types. Works identically at
      // runtime on RN, Node (tests), and any standards-compliant fetch.
      response = await fetch(`${url}/api/health`, { signal: controller.signal as any });
    } catch (err) {
      if (isAbortError(err)) return failure("timeout");
      if (isTlsError(err)) return failure("tls");
      return failure("unreachable");
    }

    // AC: any non-200 (including a legitimate server reporting 503 for a
    // failed dependency) surfaces as "Couldn't reach that address" — we
    // don't try to distinguish "found a Zor server but it's unhealthy".
    if (!response.ok) return failure("unreachable");

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return failure("invalid-response");
    }

    if (!hasHealthShape(body)) return failure("invalid-response");

    return { ok: true, url };
  } finally {
    clearTimeout(timer);
  }
}
