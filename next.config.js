const path = require("path");
const fontkitRoot = path.dirname(
  require.resolve("@foliojs-fork/fontkit/package.json")
);
const fontkitData = path.join(fontkitRoot, "data.trie");

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://images.unsplash.com https://cdn.jsdelivr.net",
  "font-src 'self' https://fonts.gstatic.com data:",
  "connect-src 'self' https://*.supabase.co https://*.supabase.in https://cdn.jsdelivr.net",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "upgrade-insecure-requests",
];

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: cspDirectives.join("; "),
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  turbopack: {},
  transpilePackages: ["@foliojs-fork/fontkit", "@foliojs-fork/pdfkit"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals)
          ? config.externals
          : config.externals
          ? [config.externals]
          : []),
        "@neondatabase/serverless",
        "ws",
        "pdfmake",
        // Keep fontkit/pdfkit bundled so assets are available
        // "@foliojs-fork/fontkit",
        // "@foliojs-fork/pdfkit",
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
  // Specify valid file extensions for Next.js pages
  pageExtensions: ["tsx", "ts", "jsx", "js"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  outputFileTracingIncludes: {
    "/api/diets/download/[id]": [fontkitData],
    "/api/diets/download-pdfmake/[id]": [fontkitData],
  },
};

module.exports = nextConfig;
