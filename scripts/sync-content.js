#!/usr/bin/env node

/**
 * Sync Content Script
 *
 * Regenerates sitemaps and syncs CMS content for all client sites.
 *
 * Usage:
 *   node scripts/sync-content.js          # Regenerate sitemaps
 *   node scripts/sync-content.js --sync   # Sync CMS content
 */

const fs = require('fs');
const path = require('path');

const CLIENTS_DIR = path.join(__dirname, '..', 'out', 'clients');

function generateSitemap(baseUrl, pages) {
  const urls = pages
    .map(
      (page) => `  <url>
    <loc>${baseUrl}${page}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${page === '/' ? '1.0' : '0.8'}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

function syncSitemaps() {
  console.log('Regenerating sitemaps...');

  if (!fs.existsSync(CLIENTS_DIR)) {
    console.log('No client sites found. Skipping sitemap generation.');
    return;
  }

  const clients = fs.readdirSync(CLIENTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const client of clients) {
    const clientDir = path.join(CLIENTS_DIR, client);
    const publicDir = path.join(clientDir, 'public');

    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const baseUrl = `https://${client}.yourdomain.com`;
    const pages = ['/', '/services', '/about', '/contact'];
    const sitemap = generateSitemap(baseUrl, pages);

    fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
    console.log(`  ✅ ${client}/public/sitemap.xml`);
  }
}

function syncCMSContent() {
  console.log('Syncing CMS content...');
  console.log('  ℹ️  CMS sync is a placeholder — connect to your CMS API here.');
}

function main() {
  const args = process.argv.slice(2);
  const doSync = args.includes('--sync');

  syncSitemaps();

  if (doSync) {
    syncCMSContent();
  }

  console.log('\n✅ Content sync complete.');
}

main();
