import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ironpulse/api", "@ironpulse/db", "@ironpulse/shared"],
};

export default nextConfig;
