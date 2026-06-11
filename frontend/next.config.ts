import type { NextConfig } from "next";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  async rewrites() {
    // In production (Vercel), lib/api.ts uses NEXT_PUBLIC_API_URL directly.
    // This proxy only activates locally so you can run `next dev` against
    // the backend on localhost:8080 without CORS issues.
    if (process.env.NODE_ENV !== "development") {
      return [];
    }
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
      {
        source: "/ws",
        destination: `${BACKEND_URL}/ws`,
      },
      {
        source: "/ws/:path*",
        destination: `${BACKEND_URL}/ws/:path*`,
      },
    ];
  },
};

export default nextConfig;
