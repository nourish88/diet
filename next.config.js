/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  // Exclude pdfkit and pdfmake from webpack bundling
  serverComponentsExternalPackages: [
    "pdfkit",
    "pdfmake",
    "@foliojs-fork/fontkit",
    "@foliojs-fork/pdfkit",
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...config.externals,
        "@neondatabase/serverless",
        "ws",
        "pdfmake",
        "@foliojs-fork/fontkit",
        "@foliojs-fork/pdfkit",
      ];

      // Fix for pdfkit in Next.js
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };
    }

    // Add fallback for 'crypto'
    config.resolve.fallback = {
      ...config.resolve.fallback,
      crypto: false,
      fs: false,
      path: false,
    };

    // Ignore pdfkit warnings
    config.ignoreWarnings = [{ module: /node_modules\/pdfkit/ }];

    return config;
  },
  // Exclude mobile directory from Next.js build
  // Specify valid file extensions for Next.js pages
  pageExtensions: ["tsx", "ts", "jsx", "js"],
  //experimental: {
  //  externalDir: true,
  //},
  // Exclude mobile directory
  exclude: ["mobile/**/*"],
};

module.exports = nextConfig;
