/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/platform-builder', // Add this line
  transpilePackages: ['@platform-builder/ui-components', '@platform-builder/utils'],
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true, // Required for static export with remote images
  },
};

module.exports = nextConfig;
