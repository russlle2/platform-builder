import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';

export interface OptimizeOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export interface OptimizeResult {
  inputPath: string;
  outputPath: string;
  originalSize: number;
  optimizedSize: number;
  savings: number;
  format: string;
}

const DEFAULT_OPTIONS: OptimizeOptions = {
  width: 1920,
  quality: 80,
  format: 'webp',
  fit: 'cover',
};

export async function optimizeImage(
  inputPath: string,
  outputDir: string,
  options: OptimizeOptions = {}
): Promise<OptimizeResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const inputStats = fs.statSync(inputPath);
  const ext = opts.format || 'webp';
  const basename = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(outputDir, `${basename}.${ext}`);

  let pipeline = sharp(inputPath);

  if (opts.width || opts.height) {
    pipeline = pipeline.resize(opts.width, opts.height, { fit: opts.fit });
  }

  switch (opts.format) {
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality: opts.quality, mozjpeg: true });
      break;
    case 'png':
      pipeline = pipeline.png({ quality: opts.quality });
      break;
    case 'avif':
      pipeline = pipeline.avif({ quality: opts.quality });
      break;
    case 'webp':
    default:
      pipeline = pipeline.webp({ quality: opts.quality });
      break;
  }

  await pipeline.toFile(outputPath);

  const outputStats = fs.statSync(outputPath);

  return {
    inputPath,
    outputPath,
    originalSize: inputStats.size,
    optimizedSize: outputStats.size,
    savings: Math.round((1 - outputStats.size / inputStats.size) * 100),
    format: ext,
  };
}
