<<<<<<< HEAD
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

export interface OptimizationOptions {
  quality?: number;
  width?: number;
  height?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  progressive?: boolean;
  withoutEnlargement?: boolean;
}

export interface OptimizationResult {
  success: boolean;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  outputPath: string;
  format: string;
  width: number;
  height: number;
  error?: string;
}

/**
 * Optimize a single image using Sharp
 */
export async function optimizeImage(
  inputPath: string,
  outputPath: string,
  options: OptimizationOptions = {}
): Promise<OptimizationResult> {
  try {
    const {
      quality = 80,
      width,
      height,
      format = 'webp',
      fit = 'cover',
      progressive = true,
      withoutEnlargement = true,
    } = options;

    // Read original file size
    const originalStats = await fs.stat(inputPath);
    const originalSize = originalStats.size;

    // Create Sharp instance
    let pipeline = sharp(inputPath);

    // Resize if dimensions provided
    if (width || height) {
      pipeline = pipeline.resize(width, height, {
        fit,
        withoutEnlargement,
      });
    }

    // Apply format-specific optimizations
    switch (format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality, progressive });
        break;
      case 'png':
        pipeline = pipeline.png({ 
          quality, 
          compressionLevel: 9,
          progressive 
        });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality });
        break;
      case 'avif':
        pipeline = pipeline.avif({ quality });
        break;
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // Process and save
    const info = await pipeline.toFile(outputPath);

    // Get optimized file size
    const optimizedStats = await fs.stat(outputPath);
    const optimizedSize = optimizedStats.size;

    const compressionRatio = ((originalSize - optimizedSize) / originalSize) * 100;

    return {
      success: true,
      originalSize,
      optimizedSize,
      compressionRatio,
      outputPath,
      format: info.format,
      width: info.width,
      height: info.height,
    };
  } catch (error) {
    return {
      success: false,
      originalSize: 0,
      optimizedSize: 0,
      compressionRatio: 0,
      outputPath: '',
      format: '',
      width: 0,
      height: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate responsive image variants
 */
export async function generateResponsiveVariants(
  inputPath: string,
  outputDir: string,
  baseName: string,
  sizes: number[] = [320, 640, 768, 1024, 1280, 1920]
): Promise<OptimizationResult[]> {
  const results: OptimizationResult[] = [];
  
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `${baseName}-${size}w.webp`);
    const result = await optimizeImage(inputPath, outputPath, {
      width: size,
      format: 'webp',
      quality: 80,
    });
    results.push(result);
  }

  return results;
}

/**
 * Batch optimize multiple images
 */
export async function batchOptimize(
  inputPaths: string[],
  outputDir: string,
  options: OptimizationOptions = {}
): Promise<OptimizationResult[]> {
  const results: OptimizationResult[] = [];

  for (const inputPath of inputPaths) {
    const fileName = path.basename(inputPath, path.extname(inputPath));
    const outputPath = path.join(outputDir, `${fileName}.${options.format || 'webp'}`);
    
    const result = await optimizeImage(inputPath, outputPath, options);
    results.push(result);
  }

  return results;
}

/**
 * Convert image to multiple formats
 */
export async function convertToFormats(
  inputPath: string,
  outputDir: string,
  formats: Array<'jpeg' | 'png' | 'webp' | 'avif'> = ['webp', 'avif']
): Promise<OptimizationResult[]> {
  const results: OptimizationResult[] = [];
  const baseName = path.basename(inputPath, path.extname(inputPath));

  for (const format of formats) {
    const outputPath = path.join(outputDir, `${baseName}.${format}`);
    const result = await optimizeImage(inputPath, outputPath, { format });
    results.push(result);
  }

  return results;
}

/**
 * Get image metadata
 */
export async function getImageMetadata(imagePath: string) {
  try {
    const metadata = await sharp(imagePath).metadata();
    return {
      success: true,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      space: metadata.space,
      channels: metadata.channels,
      depth: metadata.depth,
      density: metadata.density,
      hasAlpha: metadata.hasAlpha,
      orientation: metadata.orientation,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export default {
  optimizeImage,
  generateResponsiveVariants,
  batchOptimize,
  convertToFormats,
  getImageMetadata,
};
=======
export { optimizeImage, type OptimizeOptions, type OptimizeResult } from './optimizer';
export { processDirectory } from './batch';
>>>>>>> origin/main
