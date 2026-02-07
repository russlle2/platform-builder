#!/usr/bin/env node

/**
 * Sync Content Script
 * Syncs content from CMS or database to all client sites
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SITES_DIR = path.join(__dirname, '../../generated-sites');
const CONTENT_DIR = path.join(__dirname, '../../content');

/**
 * Main function to sync content
 */
async function syncContent() {
  console.log('🔄 Starting content sync...');

  // Check if sites directory exists
  if (!fs.existsSync(SITES_DIR)) {
    console.log('⚠️  No generated sites found');
    return;
  }

  // Get all site directories
  const sites = fs.readdirSync(SITES_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

  if (sites.length === 0) {
    console.log('⚠️  No sites to sync');
    return;
  }

  console.log(`📂 Found ${sites.length} site(s) to sync`);

  let successCount = 0;
  let failureCount = 0;

  for (const site of sites) {
    try {
      console.log(`\n📋 Syncing ${site}...`);
      
      const siteDir = path.join(SITES_DIR, site);
      const siteContentDir = path.join(siteDir, 'content');

      // Create content directory if it doesn't exist
      if (!fs.existsSync(siteContentDir)) {
        fs.mkdirSync(siteContentDir, { recursive: true });
      }

      // Load site-specific configuration
      const configPath = path.join(siteDir, '.env.local');
      let siteConfig = {};
      
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8');
        configContent.split('\n').forEach(line => {
          const [key, value] = line.split('=');
          if (key && value) {
            siteConfig[key.trim()] = value.trim().replace(/"/g, '');
          }
        });
      }

      // Sync global content
      if (fs.existsSync(CONTENT_DIR)) {
        syncDirectory(CONTENT_DIR, siteContentDir);
      }

      // Sync site-specific content from API or database
      // This is a placeholder for actual API/database integration
      const siteData = {
        siteName: siteConfig.NEXT_PUBLIC_SITE_NAME || site,
        siteId: siteConfig.NEXT_PUBLIC_SITE_ID || site,
        lastSync: new Date().toISOString(),
        syncedAt: Date.now(),
      };

      // Write sync metadata
      fs.writeFileSync(
        path.join(siteContentDir, 'sync-metadata.json'),
        JSON.stringify(siteData, null, 2)
      );

      // Optionally regenerate static pages
      console.log('🔧 Regenerating static pages...');
      try {
        execSync('npm run build', { 
          cwd: siteDir, 
          stdio: 'pipe' 
        });
      } catch (buildError) {
        console.warn('⚠️  Build failed, but content was synced');
      }

      console.log(`✅ ${site} synced successfully`);
      successCount++;

    } catch (error) {
      console.error(`❌ Error syncing ${site}:`, error.message);
      failureCount++;
    }
  }

  console.log('\n📊 Sync Summary:');
  console.log(`  ✅ Successful: ${successCount}`);
  console.log(`  ❌ Failed: ${failureCount}`);
  console.log(`  📦 Total: ${sites.length}`);
}

/**
 * Recursively sync directory contents
 */
function syncDirectory(src, dest) {
  if (!fs.existsSync(src)) {
    return;
  }

  // Create destination if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      syncDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Run the script
syncContent().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
