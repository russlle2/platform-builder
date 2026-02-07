#!/usr/bin/env node

/**
 * Optimize Images Script
 * Batch optimizes images across the project using Sharp
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Configuration
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.tiff'];
const DEFAULT_QUALITY = 80;
const OUTPUT_FORMATS = ['webp', 'avif'];

/**
 * Main function to optimize images
 */
async function optimizeImages() {
  const targetDir = process.argv[2] || process.cwd();
  
  console.log('🎨 Starting image optimization...');
  console.log(`📁 Target directory: ${targetDir}`);

  if (!fs.existsSync(targetDir)) {
    console.error(`❌ Error: Directory not found: ${targetDir}`);
    process.exit(1);
  }

  const imageFiles = findImageFiles(targetDir);
  
  if (imageFiles.length === 0) {
    console.log('⚠️  No images found to optimize');
    return;
  }

  console.log(`📸 Found ${imageFiles.length} image(s) to optimize`);

  let successCount = 0;
  let failureCount = 0;
  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;

  for (const imagePath of imageFiles) {
    try {
      const result = await optimizeImage(imagePath);
      
      if (result.success) {
        totalOriginalSize += result.originalSize;
        totalOptimizedSize += result.optimizedSize;
        successCount++;
        
        const savings = ((result.originalSize - result.optimizedSize) / result.originalSize * 100).toFixed(1);
        console.log(`✅ ${path.basename(imagePath)}: ${formatBytes(result.originalSize)} → ${formatBytes(result.optimizedSize)} (${savings}% savings)`);
      } else {
        failureCount++;
        console.error(`❌ ${path.basename(imagePath)}: ${result.error}`);
      }
    } catch (error) {
      failureCount++;
      console.error(`❌ ${path.basename(imagePath)}: ${error.message}`);
    }
  }

  const overallSavings = totalOriginalSize > 0 
    ? ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize * 100).toFixed(1)
    : 0;

  console.log('\n📊 Optimization Summary:');
  console.log(`  ✅ Successful: ${successCount}`);
  console.log(`  ❌ Failed: ${failureCount}`);
  console.log(`  📦 Total: ${imageFiles.length}`);
  console.log(`  💾 Original Size: ${formatBytes(totalOriginalSize)}`);
  console.log(`  💾 Optimized Size: ${formatBytes(totalOptimizedSize)}`);
  console.log(`  📉 Total Savings: ${overallSavings}%`);
}

/**
 * Find all image files recursively
 */
function findImageFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(dir, file.name);

    // Skip node_modules, .next, and other build/cache directories
    if (file.isDirectory()) {
      if (file.name === 'node_modules' || 
          file.name === '.next' || 
          file.name === 'dist' ||
          file.name === '.git' ||
          file.name === 'optimized') {
        continue;
      }
      findImageFiles(filePath, fileList);
    } else {
      const ext = path.extname(file.name).toLowerCase();
      if (IMAGE_EXTENSIONS.includes(ext)) {
        fileList.push(filePath);
      }
    }
  }

  return fileList;
}

/**
 * Optimize a single image
 */
async function optimizeImage(imagePath) {
  try {
    const originalStats = fs.statSync(imagePath);
    const originalSize = originalStats.size;

    const dir = path.dirname(imagePath);
    const ext = path.extname(imagePath);
    const baseName = path.basename(imagePath, ext);
    
    // Create optimized directory
    const optimizedDir = path.join(dir, 'optimized');
    if (!fs.existsSync(optimizedDir)) {
      fs.mkdirSync(optimizedDir, { recursive: true });
    }

    // Get image metadata
    const metadata = await sharp(imagePath).metadata();
    
    // Optimize in original format
    const optimizedPath = path.join(optimizedDir, `${baseName}${ext}`);
    await sharp(imagePath)
      .jpeg({ quality: DEFAULT_QUALITY, progressive: true })
      .png({ quality: DEFAULT_QUALITY, compressionLevel: 9 })
      .webp({ quality: DEFAULT_QUALITY })
      .toFile(optimizedPath);

    // Generate additional formats (WebP, AVIF)
    for (const format of OUTPUT_FORMATS) {
      const formatPath = path.join(optimizedDir, `${baseName}.${format}`);
      
      let pipeline = sharp(imagePath);
      
      if (format === 'webp') {
        pipeline = pipeline.webp({ quality: DEFAULT_QUALITY });
      } else if (format === 'avif') {
        pipeline = pipeline.avif({ quality: DEFAULT_QUALITY });
      }
      
      await pipeline.toFile(formatPath);
    }

    // Generate responsive variants (if image is large)
    if (metadata.width && metadata.width > 640) {
      const sizes = [320, 640, 768, 1024, 1280, 1920];
      
      for (const size of sizes) {
        if (size < metadata.width) {
          const responsivePath = path.join(optimizedDir, `${baseName}-${size}w.webp`);
          await sharp(imagePath)
            .resize(size, null, { withoutEnlargement: true })
            .webp({ quality: DEFAULT_QUALITY })
            .toFile(responsivePath);
        }
      }
    }

    const optimizedStats = fs.statSync(optimizedPath);
    const optimizedSize = optimizedStats.size;

    return {
      success: true,
      originalSize,
      optimizedSize,
    };
  } catch (error) {
    return {
      success: false,
      originalSize: 0,
      optimizedSize: 0,
      error: error.message,
    };
  }
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run the script
optimizeImages().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
