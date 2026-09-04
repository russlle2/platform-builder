import type { MetadataRoute } from 'next'
import { shouldIndexDeployment } from '@/lib/deployment-environment'

export default function robots(): MetadataRoute.Robots {
  if (!shouldIndexDeployment()) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    }
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_PLATFORM_URL ||
    'https://dailyclarity.org'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
