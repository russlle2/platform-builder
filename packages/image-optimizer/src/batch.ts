import * as fs from 'fs';
import * as path from 'path';
import { optimizeImage, type OptimizeOptions, type OptimizeResult } from './optimizer';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tiff'];

export async function processDirectory(
  inputDir: string,
  outputDir: string,
  options: OptimizeOptions = {}
): Promise<OptimizeResult[]> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const files = fs.readdirSync(inputDir);
  const imageFiles = files.filter((f) =>
    IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase())
  );

  const results: OptimizeResult[] = [];

  for (const file of imageFiles) {
    const inputPath = path.join(inputDir, file);
    const result = await optimizeImage(inputPath, outputDir, options);
    results.push(result);
  }

  return results;
}
