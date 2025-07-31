import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  api: {
    bodyParser: {
      sizeLimit: '100mb', // 增加到100MB的限制
    },
    responseLimit: '100mb', // 同樣增加響應大小限制
  },
};

export default nextConfig;
