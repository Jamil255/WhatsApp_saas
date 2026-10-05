import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    cpus: 1,
    webpackBuildWorker: false,
    workerThreads: false,
  },
};

export default nextConfig;
