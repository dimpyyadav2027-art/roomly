import type { NextConfig } from "next";

const nextConfig: NextConfig = { serverExternalPackages: ["pg", "pg-cloudflare"],
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "myroomly.in" }],
        destination: "https://www.myroomly.in/:path*",
        permanent: true,
      },
    ];
  } };

export default nextConfig;
