import { describe, expect, it } from 'vitest'
import {
  applyInlineTextEdits,
  buildContactFormScript,
  buildSearchEngineFiles,
  chunkJsonToMetadata,
  sanitizeCustomerValues,
  sanitizeInlineEditMap,
  unchunkJsonFromMetadata,
} from './site-deploy'

describe('site customization safety', () => {
  it('escapes inline edits before inserting them into deployed HTML', () => {
    const html = '<h1>Original heading</h1>'
    expect(applyInlineTextEdits(html, [{
      original: 'Original heading',
      updated: '</h1><script>alert(1)</script>',
    }])).toBe(
      '<h1 data-pb-edit-id="pb-index-0001">&lt;/h1&gt;&lt;script&gt;alert(1)&lt;/script&gt;</h1>',
    )
  })

  it('uses the same page-specific ID contract for targeted deploy edits', () => {
    const html = '<p>&copy; Same</p><p>&copy; Same</p>'
    expect(applyInlineTextEdits(html, [{
      id: 'pb-about-0002',
      original: '© Same',
      updated: 'Second & safe',
    }], 'about.html')).toBe(
      '<p data-pb-edit-id="pb-about-0001">&copy; Same</p>' +
      '<p data-pb-edit-id="pb-about-0002">Second &amp; safe</p>',
    )
  })

  it('normalizes untrusted value and edit maps with strict limits', () => {
    expect(sanitizeCustomerValues({ BUSINESS_NAME: 'Studio', bad_key: 42, 'bad-key': 'x' }))
      .toEqual({ BUSINESS_NAME: 'Studio' })
    expect(sanitizeInlineEditMap({
      'index.html': [
        { id: 'pb-index-0001', original: 'Old', updated: 'New' },
        { id: 'unsafe-id', original: 'Other', updated: 'Changed' },
        { original: '', updated: 'x' },
      ],
      '../admin.html': [{ original: 'a', updated: 'b' }],
    })).toEqual({
      'index.html': [
        { id: 'pb-index-0001', original: 'Old', updated: 'New' },
        { original: 'Other', updated: 'Changed' },
      ],
    })
  })

  it('round-trips bounded legacy metadata chunks', () => {
    const value = { note: 'x'.repeat(1_200) }
    const metadata = chunkJsonToMetadata('payload', value)
    expect(unchunkJsonFromMetadata('payload', metadata, {})).toEqual(value)
  })

  it('routes only full inquiry forms to the central API with accessible status and privacy copy', () => {
    const script = buildContactFormScript('calm-studio')
    expect(script).toContain('https://dailyclarity.org/api/forms/contact?slug=calm-studio')
    expect(script).toContain('form.querySelector(\'textarea\')')
    expect(script).toContain('data-dailyclarity-form-status')
    expect(script).toContain('do not include medical, mental-health, financial, or other sensitive information')
    expect(script).toContain("e.stopImmediatePropagation()")
    expect(script).toContain("result.deliveryStatus === 'sent'")
    expect(script).toContain('received and saved for follow-up')
  })

  it('generates canonical robots and sitemap files for every declared page', () => {
    const files = buildSearchEngineFiles(
      'https://calm-studio.netlify.app/ignored/path',
      ['index.html', 'about.html', 'contact/team.html'],
    )
    expect(files?.['robots.txt']).toContain('Sitemap: https://calm-studio.netlify.app/sitemap.xml')
    expect(files?.['sitemap.xml']).toContain('<loc>https://calm-studio.netlify.app/</loc>')
    expect(files?.['sitemap.xml']).toContain('<loc>https://calm-studio.netlify.app/contact/team.html</loc>')
    expect(buildSearchEngineFiles('javascript:alert(1)', ['index.html'])).toBeNull()
  })

  it('keeps isolated E2E customer sites out of search indexes', () => {
    const files = buildSearchEngineFiles(
      'https://platform-e2e-calm-studio.netlify.app',
      ['index.html', 'about.html'],
      false,
    )

    expect(files).toEqual({
      'robots.txt': 'User-agent: *\nDisallow: /\n',
      'sitemap.xml': [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
        '',
      ].join('\n'),
      '_headers': '/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n',
    })
    expect(files?.['sitemap.xml']).not.toContain('<loc>')
  })
})
