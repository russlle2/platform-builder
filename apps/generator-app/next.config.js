/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@platform-builder/ui-components', '@platform-builder/utils'],
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;
