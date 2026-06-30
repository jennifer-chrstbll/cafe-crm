/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable webpack filesystem cache to avoid OOM during compilation
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
  experimental: {
    webpackMemoryOptimizations: true,
  },
}

module.exports = nextConfig
