/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return [{ source: "/settings/users", destination: "/staff", permanent: true }];
  },
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
