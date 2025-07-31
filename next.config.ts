import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'canvas', 'unzipper', 'fs', 'path', 'os'],
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack(config) {
    // 添加 Node.js polyfills
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
    };
    return config;
  },
};

export default nextConfig;
