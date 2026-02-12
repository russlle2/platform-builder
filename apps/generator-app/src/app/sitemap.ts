import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://main--keen-buttercream-c3c10a.netlify.app'

  return [
    { url: `${baseUrl}/`, lastModified: new Date() },
    { url: `${baseUrl}/pricing`, lastModified: new Date() },
    { url: `${baseUrl}/wizard`, lastModified: new Date() },
    { url: `${baseUrl}/templates`, lastModified: new Date() },
    { url: `${baseUrl}/proof`, lastModified: new Date() },
    { url: `${baseUrl}/portal`, lastModified: new Date() },
  ]
}
