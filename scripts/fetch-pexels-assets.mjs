import fs from 'node:fs/promises'
import path from 'node:path'

const API_KEY = process.env.PEXELS_API_KEY
if (!API_KEY) {
  console.error('Missing PEXELS_API_KEY environment variable.')
  process.exit(1)
}

const workspaceRoot = process.cwd()
const publicImagesDir = path.join(workspaceRoot, 'apps/generator-app/public/images')
const backgroundsDir = path.join(publicImagesDir, 'backgrounds')
const dataDir = path.join(workspaceRoot, 'apps/generator-app/src/data')
const backgroundsJsonPath = path.join(dataDir, 'backgrounds.json')

const totalBackgrounds = 48
const queries = [
  { query: 'hvac equipment', count: 12 },
  { query: 'plumbing tools', count: 12 },
  { query: 'modern home interior', count: 12 },
  { query: 'abstract gradient texture', count: 12 },
]

const namedDownloads = [
  { query: 'air conditioner condenser', fileName: 'hvac-condenser.jpg' },
  { query: 'hvac technician', fileName: 'hvac-background.jpg' },
  { query: 'mahogany wood texture', fileName: 'mahogany.jpg' },
]

const sanitize = (value) => value.replace(/\s+/g, ' ').trim()

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Authorization: API_KEY },
  })
  if (!response.ok) {
    throw new Error(`Pexels request failed: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

async function searchPhotos(query, perPage = 30) {
  const url = new URL('https://api.pexels.com/v1/search')
  url.searchParams.set('query', query)
  url.searchParams.set('per_page', String(perPage))
  return fetchJson(url)
}

async function downloadFile(url, filePath) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  await fs.writeFile(filePath, buffer)
}

async function ensureDirs() {
  await fs.mkdir(publicImagesDir, { recursive: true })
  await fs.mkdir(backgroundsDir, { recursive: true })
  await fs.mkdir(dataDir, { recursive: true })
}

function getPhotoSrc(photo) {
  return photo?.src?.large2x || photo?.src?.large || photo?.src?.original
}

async function downloadBackgrounds() {
  const seen = new Set()
  const backgrounds = []
  let index = 1

  for (const { query, count } of queries) {
    if (index > totalBackgrounds) break
    const result = await searchPhotos(query, 30)
    const photos = result?.photos || []

    for (const photo of photos) {
      if (backgrounds.length >= totalBackgrounds) break
      if (backgrounds.filter((item) => item.query === query).length >= count) break
      if (seen.has(photo.id)) continue

      const src = getPhotoSrc(photo)
      if (!src) continue

      const fileName = `bg-${String(index).padStart(3, '0')}.jpg`
      const filePath = path.join(backgroundsDir, fileName)

      await downloadFile(src, filePath)

      backgrounds.push({
        id: photo.id,
        src: `/images/backgrounds/${fileName}`,
        alt: sanitize(photo.alt || `${query} background`),
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        pexelsUrl: photo.url,
        query,
        width: photo.width,
        height: photo.height,
        license: 'Pexels License',
      })

      seen.add(photo.id)
      index += 1
    }
  }

  if (backgrounds.length < totalBackgrounds) {
    throw new Error(`Only downloaded ${backgrounds.length} backgrounds. Increase per_page or adjust queries.`)
  }

  return backgrounds
}

async function downloadNamedAssets() {
  for (const { query, fileName } of namedDownloads) {
    const result = await searchPhotos(query, 5)
    const photo = result?.photos?.[0]
    const src = getPhotoSrc(photo)
    if (!src) {
      throw new Error(`No image found for ${query}`)
    }
    const filePath = path.join(publicImagesDir, fileName)
    await downloadFile(src, filePath)
  }
}

async function copyAssets(backgrounds) {
  const copyMap = [
    { sourceIndex: 1, target: 'template-bg-1.jpg' },
    { sourceIndex: 2, target: 'template-bg-2.jpg' },
    { sourceIndex: 3, target: 'template-bg-3.jpg' },
    { sourceIndex: 4, target: 'template-bg-4.jpg' },
    { sourceIndex: 5, target: 'template-bg-5.jpg' },
    { sourceIndex: 6, target: 'template-bg-6.jpg' },
    { sourceIndex: 7, target: 'template-modern-hvac.jpg' },
    { sourceIndex: 8, target: 'template-industrial.jpg' },
    { sourceIndex: 9, target: 'template-comfort.jpg' },
    { sourceIndex: 10, target: 'template-plumbing.jpg' },
    { sourceIndex: 11, target: 'template-emergency.jpg' },
    { sourceIndex: 12, target: 'template-residential.jpg' },
  ]

  for (let i = 1; i <= 9; i += 1) {
    copyMap.push({ sourceIndex: i, target: `template-${i}.jpg` })
  }

  for (let i = 1; i <= 6; i += 1) {
    copyMap.push({ sourceIndex: i + 12, target: `proof-${i}.jpg` })
  }

  for (const item of copyMap) {
    const source = backgrounds[item.sourceIndex - 1]
    if (!source) {
      throw new Error(`Missing background for copy target ${item.target}`)
    }
    const sourcePath = path.join(publicImagesDir, source.src.replace('/images/', ''))
    const targetPath = path.join(publicImagesDir, item.target)
    await fs.copyFile(sourcePath, targetPath)
  }
}

async function writeBackgroundsJson(backgrounds) {
  await fs.writeFile(backgroundsJsonPath, JSON.stringify(backgrounds, null, 2))
}

async function main() {
  await ensureDirs()
  const backgrounds = await downloadBackgrounds()
  await downloadNamedAssets()
  await copyAssets(backgrounds)
  await writeBackgroundsJson(backgrounds)
  console.log(`Downloaded ${backgrounds.length} backgrounds and generated metadata.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
