import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  webpack: (config) => {
    // Polyfills for CKB-CCC packages that use Node.js APIs
    config.resolve.fallback = {
      ...config.resolve.fallback,
      buffer: require.resolve("buffer/"),
      stream: require.resolve("stream-browserify"),
      process: require.resolve("process/browser"),
      events: require.resolve("events/"),
      util: require.resolve("util/"),
    };
    return config;
  },
};

export default nextConfig;
