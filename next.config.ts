import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'canvas'],
  },
  webpack(config) {
    return config;
  },
};

export default nextConfig;
