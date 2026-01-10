import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude firebase-admin from bundling - it needs to be loaded as an external package
  serverExternalPackages: ['firebase-admin'],
};

export default nextConfig;
