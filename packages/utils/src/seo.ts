export interface MetaTags {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  canonicalUrl?: string;
  type?: string;
}

export function generateMetaTags(config: MetaTags): Record<string, string> {
  const tags: Record<string, string> = {
    title: config.title,
    description: config.description,
    'og:title': config.title,
    'og:description': config.description,
    'og:type': config.type || 'website',
  };

  if (config.keywords?.length) {
    tags.keywords = config.keywords.join(', ');
  }
  if (config.ogImage) {
    tags['og:image'] = config.ogImage;
  }
  if (config.canonicalUrl) {
    tags.canonical = config.canonicalUrl;
  }

  return tags;
}

export interface SitemapEntry {
  url: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export function generateSitemap(baseUrl: string, entries: SitemapEntry[]): string {
  const urls = entries
    .map(
      (entry) => `  <url>
    <loc>${baseUrl}${entry.url}</loc>
    ${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ''}
    ${entry.changefreq ? `<changefreq>${entry.changefreq}</changefreq>` : ''}
    ${entry.priority !== undefined ? `<priority>${entry.priority}</priority>` : ''}
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export function generateRobotsTxt(baseUrl: string, disallow: string[] = []): string {
  const disallowRules = disallow.map((path) => `Disallow: ${path}`).join('\n');
  return `User-agent: *
${disallowRules}
Allow: /

Sitemap: ${baseUrl}/sitemap.xml`;
}
