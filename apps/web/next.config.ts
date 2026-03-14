import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@ironpulse/api", "@ironpulse/db", "@ironpulse/shared"],
};

export default nextConfig;
