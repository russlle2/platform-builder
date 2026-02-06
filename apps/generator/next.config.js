/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@platform-builder/ui', '@platform-builder/utils'],
  images: {
    domains: ['placeholder.com', 'via.placeholder.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.placeholder.com',
      },
    ],
  },
}

module.exports = nextConfig
