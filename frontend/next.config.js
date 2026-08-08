/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output: produces a minimal self-contained build
  // (no node_modules needed on the device — saves ~800MB)
  output: 'standalone',
  // Disable webpack filesystem cache to avoid OOM during compilation
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
  turbopack: {},
  experimental: {
    webpackMemoryOptimizations: true,
  },
}

module.exports = nextConfig
