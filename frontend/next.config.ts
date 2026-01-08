import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/profile',
        destination: '/me',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
