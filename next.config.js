/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...config.externals,
        "@neondatabase/serverless",
        "ws",
      ];
    }

    // Add fallback for 'crypto'
    config.resolve.fallback = {
      ...config.resolve.fallback,
      crypto: false,
    };

    return config;
  },
  // Exclude mobile directory from Next.js build
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  experimental: {
    externalDir: true,
  },
};

module.exports = nextConfig;
