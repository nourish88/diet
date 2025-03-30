/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  experimental: {
    serverActions: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        '@neondatabase/serverless': '@neondatabase/serverless',
        'ws': 'ws',
      });
    }
    return config;
  }
};

module.exports = nextConfig;
