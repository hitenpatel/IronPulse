import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const isDev = process.env.NODE_ENV !== "production";

// Production CSP — drops unsafe-eval entirely. We can't add 'strict-dynamic'
// here without a per-request nonce, because strict-dynamic makes modern
// browsers IGNORE 'unsafe-inline', which breaks Next.js's inline bootstrap
// scripts (hydration silently fails and forms fall back to native GET).
// Dev mode keeps 'unsafe-eval' because Turbopack's HMR runtime needs it.
//
// Follow-up: migrate to per-request nonce via middleware.ts to allow
// re-adding strict-dynamic and dropping 'unsafe-inline' on modern browsers.
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.amazonaws.com http://localhost:9000",
      "connect-src 'self' https://*.amazonaws.com https://api.strava.com https://connect.garmin.com https://*.ingest.sentry.io wss: http://localhost:9000",
      "worker-src 'self' blob:",
      "font-src 'self' data:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // Staging-only escape hatch: when SKIP_TYPECHECK_ON_BUILD=1, Next.js skips
  // TS errors during build. Used by the staging stack on the VM so a single
  // type error doesn't block the entire QA test environment. CI builds (which
  // do NOT set this var) remain strict and continue to catch type regressions.
  typescript: {
    ignoreBuildErrors: process.env.SKIP_TYPECHECK_ON_BUILD === "1",
  },
  eslint: {
    ignoreDuringBuilds: process.env.SKIP_TYPECHECK_ON_BUILD === "1",
  },
  serverExternalPackages: ["@simplewebauthn/server"],
  transpilePackages: [
    "@ironpulse/api",
    "@ironpulse/db",
    "@ironpulse/shared",
    "@ironpulse/sync",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "**.apple.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      topLevelAwait: true,
    };
    return config;
  },
};

export default withBundleAnalyzer(
  withSentryConfig(nextConfig, {
    silent: true,
    disableLogger: true,
  }),
);
