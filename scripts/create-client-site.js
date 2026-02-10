#!/usr/bin/env node

/**
 * Create Client Site Script
 *
 * Generates a new client site from the client-template.
 *
 * Usage:
 *   node scripts/create-client-site.js --name "Business Name" --type hvac
 */

const fs = require('fs');
const path = require('path');

const TEMPLATE_DIR = path.join(__dirname, '..', 'apps', 'client-template');
const OUTPUT_BASE = path.join(__dirname, '..', 'out', 'clients');

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    name: '',
    type: 'hvac',
    phone: '',
    email: '',
    address: '',
    description: '',
  };

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    if (key in config) {
      config[key] = value;
    }
  }

  return config;
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function copyDirectory(src, dest, replacements) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.name === 'node_modules' || entry.name === '.next') {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath, replacements);
    } else {
      let content = fs.readFileSync(srcPath, 'utf8');

      for (const [placeholder, value] of Object.entries(replacements)) {
        content = content.split(placeholder).join(value);
      }

      fs.writeFileSync(destPath, content);
    }
  }
}

function main() {
  const config = parseArgs();

  if (!config.name) {
    console.error('Error: --name is required');
    console.log('Usage: node scripts/create-client-site.js --name "Business Name" --type hvac');
    process.exit(1);
  }

  const slug = slugify(config.name);
  const outputDir = path.join(OUTPUT_BASE, slug);

  console.log(`Creating client site: ${config.name}`);
  console.log(`Output: ${outputDir}`);

  const replacements = {
    'PLACEHOLDER_BUSINESS_NAME': config.name,
    'PLACEHOLDER_BUSINESS_TYPE': config.type,
    'PLACEHOLDER_BUSINESS_PHONE': config.phone || '(555) 000-0000',
    'PLACEHOLDER_BUSINESS_EMAIL': config.email || 'contact@example.com',
    'PLACEHOLDER_BUSINESS_ADDRESS': config.address || '123 Main St',
    'PLACEHOLDER_BUSINESS_DESCRIPTION': config.description || `Professional ${config.type} services`,
  };

  copyDirectory(TEMPLATE_DIR, outputDir, replacements);

  console.log('✅ Client site created successfully!');
  console.log(`\nTo run: cd ${outputDir} && npm install && npm run dev`);
}

main();
