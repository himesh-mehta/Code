import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      {
        source: "/api/topics",
        destination: "http://127.0.0.1:8000/api/topics",
      },
      {
        source: "/api/topics/:id/series",
        destination: "http://127.0.0.1:8000/api/topics/:id/series",
      },
      {
        source: "/api/overview",
        destination: "http://127.0.0.1:8000/api/overview",
      },
      {
        source: "/api/overview/refresh",
        destination: "http://127.0.0.1:8000/api/overview/refresh",
      },
      {
        source: "/api/official-impact",
        destination: "http://127.0.0.1:8000/api/official-impact",
      },
      {
        source: "/api/settings",
        destination: "http://127.0.0.1:8000/api/settings",
      },
      {
        source: "/api/sources/health",
        destination: "http://127.0.0.1:8000/api/sources/health",
      },
      {
        source: "/api/opportunities",
        destination: "http://127.0.0.1:8000/api/opportunities",
      },
      {
        source: "/api/audience",
        destination: "http://127.0.0.1:8000/api/audience",
      },
      {
        source: "/api/reports",
        destination: "http://127.0.0.1:8000/api/reports",
      },
      {
        source: "/api/reports/:path*",
        destination: "http://127.0.0.1:8000/api/reports/:path*",
      },
      {
        source: "/api/campaigns",
        destination: "http://127.0.0.1:8000/api/campaigns",
      },
      {
        source: "/api/campaigns/:path*",
        destination: "http://127.0.0.1:8000/api/campaigns/:path*",
      },
      {
        source: "/api/ai/:path*",
        destination: "http://127.0.0.1:8000/api/ai/:path*",
      },
    ];
  },
};

export default nextConfig;
