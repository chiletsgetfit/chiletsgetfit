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
  async headers() {
    // Phones (esp. iOS home-screen) aggressively cache /jarvis.html.
    const noStore = [
      { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
      { key: "Pragma", value: "no-cache" },
    ];
    return [
      { source: "/jarvis", headers: noStore },
      { source: "/jarvis.html", headers: noStore },
    ];
  },
};

export default nextConfig;
