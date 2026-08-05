import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    qualities: [75, 90, 95],
  },
  async rewrites() {
    return [
      { source: "/jarvis", destination: "/jarvis.html" },
    ];
  },
};

export default nextConfig;
