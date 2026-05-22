/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['@agnostic/core'],
  webpack(config, { isServer, nextRuntime }) {
    // Avoid eval-based devtool for edge runtime (middleware) — use plain source-map
    if (nextRuntime === 'edge') {
      config.devtool = 'source-map';
    }
    return config;
  }
};

module.exports = nextConfig;
