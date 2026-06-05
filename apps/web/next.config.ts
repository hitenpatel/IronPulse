import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// CSP is set per-request in middleware.ts using a cryptographic nonce,
// enabling 'strict-dynamic' without 'unsafe-inline'. Only the non-CSP
// security headers are set statically here.
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
