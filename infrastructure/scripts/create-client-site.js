#!/usr/bin/env node

/**
 * Create Client Site Script
 * Generates a new client site from the client-template
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const TEMPLATE_DIR = path.join(__dirname, '../../apps/client-template');
const SITES_DIR = path.join(__dirname, '../../generated-sites');

/**
 * Main function to create a client site
 */
async function createClientSite() {
  // Get client name from command line or prompt
  const clientName = process.argv[2];
  
  if (!clientName) {
    console.error('❌ Error: Please provide a client name');
    console.log('Usage: npm run create-client <client-name>');
    process.exit(1);
  }

  const sanitizedName = clientName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const siteDir = path.join(SITES_DIR, sanitizedName);

  console.log('🚀 Creating new client site...');
  console.log(`📁 Client: ${clientName}`);
  console.log(`📂 Directory: ${siteDir}`);

  // Check if site already exists
  if (fs.existsSync(siteDir)) {
    console.error(`❌ Error: Site "${sanitizedName}" already exists`);
    process.exit(1);
  }

  // Create sites directory if it doesn't exist
  if (!fs.existsSync(SITES_DIR)) {
    fs.mkdirSync(SITES_DIR, { recursive: true });
  }

  try {
    // Copy template to new site directory
    console.log('📋 Copying template...');
    copyRecursive(TEMPLATE_DIR, siteDir);

    // Update package.json with client name
    console.log('📝 Updating configuration...');
    const packageJsonPath = path.join(siteDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageJson.name = `client-${sanitizedName}`;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    // Create .env file with client-specific settings
    const envContent = `
NEXT_PUBLIC_SITE_NAME="${clientName}"
NEXT_PUBLIC_SITE_ID="${sanitizedName}"
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
`;
    fs.writeFileSync(path.join(siteDir, '.env.local'), envContent.trim());

    // Initialize git repository
    console.log('🔧 Initializing git repository...');
    execSync('git init', { cwd: siteDir, stdio: 'inherit' });

    // Install dependencies
    console.log('📦 Installing dependencies...');
    execSync('npm install', { cwd: siteDir, stdio: 'inherit' });

    console.log('✅ Client site created successfully!');
    console.log('');
    console.log('Next steps:');
    console.log(`  cd generated-sites/${sanitizedName}`);
    console.log(`  npm run dev`);
    console.log('');

  } catch (error) {
    console.error('❌ Error creating client site:', error.message);
    process.exit(1);
  }
}

/**
 * Recursively copy directory
 */
function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source directory does not exist: ${src}`);
  }

  // Create destination directory
  fs.mkdirSync(dest, { recursive: true });

  // Read all files/folders in source
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Skip node_modules, .next, and other build artifacts
    if (entry.name === 'node_modules' || 
        entry.name === '.next' || 
        entry.name === 'dist' ||
        entry.name === '.git') {
      continue;
    }

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Run the script
createClientSite().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
