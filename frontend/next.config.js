/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.openlmis\.org\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'openlmis-api-cache',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        networkTimeoutSeconds: 10,
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-images-cache',
        expiration: {
          maxEntries: 128,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      urlPattern: /^https:\/\/api\.mapbox\.com\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'mapbox-tiles-cache',
        expiration: {
          maxEntries: 256,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
    {
      urlPattern: /\.(?:js|css|woff|woff2|ttf|otf)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-resources-cache',
        expiration: {
          maxEntries: 128,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
  ],
});

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // 3G/4G Optimization: Image optimization
  images: {
    domains: ['api.mapbox.com', 'a.tiles.mapbox.com', 'b.tiles.mapbox.com'],
    unoptimized: false,
    formats: ['image/avif', 'image/webp'], // Prioritize modern formats
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840], // Responsive sizes
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // Icon sizes
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days cache
  },
  // 3G/4G Optimization: Bundle splitting and compression
  webpack: (config, { isServer }) => {
    // Add support for @/shared/* imports
    const path = require('path');
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/shared': path.resolve(__dirname, '../shared'),
    };

    // Optimize bundle splitting for 3G/4G
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Split vendor code
            vendor: {
              test: /node_modules/,
              name: 'vendors',
              priority: 10,
              reuseExistingChunk: true,
            },
            // Split map libraries (large)
            maps: {
              test: /node_modules\/(leaflet|mapbox-gl)/,
              name: 'maps',
              priority: 20,
              reuseExistingChunk: true,
            },
            // Split UI libraries
            ui: {
              test: /node_modules\/(@radix-ui|lucide-react)/,
              name: 'ui',
              priority: 15,
              reuseExistingChunk: true,
            },
            // Split state management
            state: {
              test: /node_modules\/(zustand|@tanstack)/,
              name: 'state',
              priority: 15,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    return config;
  },
  // 3G/4G Optimization: Compression
  compress: true,
  productionBrowserSourceMaps: false,
  env: {
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001',
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=(self)',
          },
        ],
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
