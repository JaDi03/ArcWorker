import type { NextConfig } from "next";
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

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

export default withPWA(nextConfig);
