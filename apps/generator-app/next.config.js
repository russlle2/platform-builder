const releaseShaSource = process.env.NEXT_PUBLIC_RELEASE_SHA
  ? 'NEXT_PUBLIC_RELEASE_SHA'
  : 'COMMIT_REF'
const releaseSha = process.env[releaseShaSource]
if (releaseSha && !/^[0-9a-f]{40}$/i.test(releaseSha)) {
  throw new Error(`${releaseShaSource} must be a full 40-character hexadecimal Git commit SHA`)
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: releaseSha ? { NEXT_PUBLIC_RELEASE_SHA: releaseSha.toLowerCase() } : {},
  reactStrictMode: true,
  transpilePackages: ['@platform-builder/ui-components', '@platform-builder/utils'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.placeholder.com',
      },
    ],
  },
}

module.exports = nextConfig
