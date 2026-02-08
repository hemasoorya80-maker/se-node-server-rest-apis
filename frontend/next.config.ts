import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack configuration
  turbopack: {
    // Set root to avoid workspace detection issues
    root: __dirname,
  },
  
  // Output standalone build for production
  output: 'standalone',
  
  // Image optimization configuration
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
