#!/usr/bin/env node

/**
 * Optimize Images Script
 *
 * Compresses, converts, and resizes images using Sharp.
 * Commits optimized assets back to the repo.
 *
 * Usage:
 *   node scripts/optimize-images.js
 *   node scripts/optimize-images.js --dir apps/generator-app/public/images
 *   node scripts/optimize-images.js --quality 85 --format webp
 */

const fs = require('fs');
const path = require('path');

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.tiff'];

const DEFAULT_DIRS = [
  path.join(__dirname, '..', 'apps', 'generator-app', 'public', 'images'),
  path.join(__dirname, '..', 'apps', 'client-template', 'public', 'images'),
];

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    dir: null,
    quality: 80,
    format: 'webp',
    maxWidth: 1920,
  };

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    if (key === 'dir') config.dir = value;
    if (key === 'quality') config.quality = parseInt(value, 10);
    if (key === 'format') config.format = value;
    if (key === 'maxWidth') config.maxWidth = parseInt(value, 10);
  }

  return config;
}

async function optimizeDirectory(dir, config) {
  if (!fs.existsSync(dir)) {
    console.log(`  ⚠️  Directory not found: ${dir}`);
    return [];
  }

  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.log('  ⚠️  Sharp is not installed. Run: npm install sharp');
    return [];
  }

  const files = fs.readdirSync(dir);
  const imageFiles = files.filter((f) =>
    IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase())
  );

  if (imageFiles.length === 0) {
    console.log(`  ℹ️  No images found in: ${dir}`);
    return [];
  }

  const results = [];

  for (const file of imageFiles) {
    const inputPath = path.join(dir, file);
    const ext = config.format || 'webp';
    const basename = path.basename(file, path.extname(file));
    const outputPath = path.join(dir, `${basename}.${ext}`);

    // Skip if already optimized format and same file
    if (inputPath === outputPath) continue;

    try {
      const inputStats = fs.statSync(inputPath);

      let pipeline = sharp(inputPath);
      pipeline = pipeline.resize(config.maxWidth, null, { fit: 'inside', withoutEnlargement: true });

      switch (config.format) {
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality: config.quality, mozjpeg: true });
          break;
        case 'png':
          pipeline = pipeline.png({ quality: config.quality });
          break;
        case 'avif':
          pipeline = pipeline.avif({ quality: config.quality });
          break;
        default:
          pipeline = pipeline.webp({ quality: config.quality });
      }

      await pipeline.toFile(outputPath);
      const outputStats = fs.statSync(outputPath);
      const savings = Math.round((1 - outputStats.size / inputStats.size) * 100);

      results.push({ file, savings });
      console.log(`  ✅ ${file} → ${basename}.${ext} (${savings}% savings)`);
    } catch (err) {
      console.log(`  ❌ ${file}: ${err.message}`);
    }
  }

  return results;
}

async function main() {
  console.log('🖼️  Image Optimization Pipeline\n');

  const config = parseArgs();
  const dirs = config.dir ? [config.dir] : DEFAULT_DIRS;

  for (const dir of dirs) {
    console.log(`Processing: ${dir}`);
    await optimizeDirectory(dir, config);
    console.log('');
  }

  console.log('✅ Image optimization complete.');
}

main();
