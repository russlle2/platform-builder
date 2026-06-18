const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@platform-builder/ui-components', '@platform-builder/utils'],
  images: {
    domains: ['placeholder.com', 'via.placeholder.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.placeholder.com',
      },
    ],
  },
  // Template HTML/CSS/JS (~302 MB across 58k files) lives in
  // `<repo>/platform-builder` and is mirrored into
  // `apps/generator-app/public/_templates` at build time by
  // scripts/copy-templates.mjs. Next.js File Tracing would otherwise
  // pull those files into the SSR function bundle and blow past
  // Netlify's 250 MB hard limit. Pin the trace root to the monorepo
  // root so picomatch can match `platform-builder/**` and
  // `apps/generator-app/public/_templates/**` consistently regardless
  // of what file is doing the tracing. The CDN serves them statically
  // and runtime function reads fall back to fetching from
  // /_templates/* on the live site.
  outputFileTracingRoot: path.join(__dirname, '..', '..'),
  outputFileTracingExcludes: {
    '*': [
      'platform-builder/**/*',
      'apps/generator-app/public/_templates/**/*',
    ],
  },
}

module.exports = nextConfig
