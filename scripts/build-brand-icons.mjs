#!/usr/bin/env node
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { stat } from 'node:fs/promises'

// Preserve the original artwork; browsers should download a small icon, not
// the full-resolution source on every page. The centered crop retains its mark.
const publicRoot = new URL('../apps/generator-app/public/', import.meta.url)
for (const [name, size] of [['favicon-64.png', 64], ['apple-touch-icon.png', 180]]) {
  const destination = fileURLToPath(new URL(name, publicRoot))
  await sharp(fileURLToPath(new URL('icon.png', publicRoot)))
    .resize(size, size, { fit: 'cover', position: 'centre', withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(destination)
  console.log(`${name}: ${size}×${size}, ${(await stat(destination)).size} bytes`)
}
