import { createElement } from 'react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { PageSeoSettingsPanel } from '@/components/PageSeoSettingsPanel'
import { applyInlineEditsToHtml } from './inline-edits'
import {
  PAGE_DESCRIPTION_MAX_LENGTH,
  buildPageSeoInlineEdit,
  readEditablePageSeoSettings,
} from './page-seo-settings'

const VALID_HEAD = [
  '<!doctype html><html><head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1" data-dc-edit-id="txt_999999999999999999" data-dc-edit-attribute="content">',
  '<title data-dc-edit-id="txt_111111111111111111">Harbor &amp; Pine</title>',
  '<meta content="Practical &quot;coaching&quot; support" data-dc-edit-attribute="content" data-dc-edit-id="txt_222222222222222222" name="description">',
  '</head><body></body></html>',
].join('')

describe('page SEO settings', () => {
  it('finds only verified compiler title and description slots', () => {
    expect(readEditablePageSeoSettings(VALID_HEAD)).toEqual({
      title: {
        field: 'title',
        nodeId: 'txt_111111111111111111',
        value: 'Harbor & Pine',
      },
      description: {
        field: 'description',
        nodeId: 'txt_222222222222222222',
        value: 'Practical "coaching" support',
      },
    })
  })

  it('never exposes viewport metadata and fails closed for incomplete annotations', () => {
    const missingTitleId = VALID_HEAD.replace(' data-dc-edit-id="txt_111111111111111111"', '')
    const wrongDescriptionAttribute = VALID_HEAD.replace(
      'data-dc-edit-attribute="content" data-dc-edit-id="txt_222222222222222222"',
      'data-dc-edit-attribute="title" data-dc-edit-id="txt_222222222222222222"',
    )

    expect(readEditablePageSeoSettings(missingTitleId).title).toBeNull()
    expect(readEditablePageSeoSettings(wrongDescriptionAttribute).description).toBeNull()
    const viewportOnly = VALID_HEAD.replace(/<meta content="Practical[\s\S]*?name="description">/, '')
    expect(readEditablePageSeoSettings(viewportOnly).description).toBeNull()
    expect(buildPageSeoInlineEdit(viewportOnly, 'description', 'A replacement')).toBeNull()
  })

  it('fails closed when an SEO stable ID is duplicated anywhere in the page', () => {
    const duplicatedTitle = VALID_HEAD.replace(
      '</body>',
      '<p data-dc-edit-id="txt_111111111111111111">Duplicate</p></body>',
    )
    expect(readEditablePageSeoSettings(duplicatedTitle).title).toBeNull()
    expect(buildPageSeoInlineEdit(duplicatedTitle, 'title', 'Replacement')).toBeNull()

    const sharedId = VALID_HEAD.replace(
      'txt_222222222222222222',
      'txt_111111111111111111',
    )
    expect(readEditablePageSeoSettings(sharedId)).toEqual({ title: null, description: null })
  })

  it('builds escaped, stable-ID edits and rejects unsafe or empty values', () => {
    const titleEdit = buildPageSeoInlineEdit(VALID_HEAD, 'title', 'Care <built> for you')
    expect(titleEdit).toEqual({
      nodeId: 'txt_111111111111111111',
      original: 'Harbor & Pine',
      updated: 'Care <built> for you',
    })
    expect(applyInlineEditsToHtml(VALID_HEAD, titleEdit ? [titleEdit] : [])).toContain(
      '<title data-dc-edit-id="txt_111111111111111111">Care &lt;built&gt; for you</title>',
    )
    expect(buildPageSeoInlineEdit(VALID_HEAD, 'title', '   ')).toBeNull()
    expect(buildPageSeoInlineEdit(VALID_HEAD, 'description', 'x'.repeat(PAGE_DESCRIPTION_MAX_LENGTH + 1))).toBeNull()
    expect(buildPageSeoInlineEdit(VALID_HEAD, 'title', 'Harbor & Pine')).toBeNull()
  })

  it('renders a compact current-page editor without surfacing viewport content', () => {
    const markup = renderToStaticMarkup(createElement(PageSeoSettingsPanel, {
      html: VALID_HEAD,
      page: 'about-us.html',
      onApply: vi.fn(() => true),
    }))

    expect(markup).toContain('Page &amp; SEO Settings')
    expect(markup).toContain('about us')
    expect(markup).toContain('name="page-title"')
    expect(markup).toContain('name="page-description"')
    expect(markup).toContain('Harbor &amp; Pine')
    expect(markup).not.toContain('width=device-width')
  })

  it('keeps the shared panel wired into the guided and portal-capable customer editors', () => {
    const guidedEditor = readFileSync(
      join(process.cwd(), 'src/app/preview-your-business/PreviewYourBusinessClient.tsx'),
      'utf8',
    )
    const portalEditor = readFileSync(
      join(process.cwd(), 'src/app/templates/[niche]/[slug]/page.tsx'),
      'utf8',
    )

    for (const source of [guidedEditor, portalEditor]) {
      expect(source).toContain("import { PageSeoSettingsPanel } from '@/components/PageSeoSettingsPanel'")
      expect(source).toContain('<PageSeoSettingsPanel')
      expect(source).toContain('onPageSeoChange')
      expect(source).toContain('buildPageSeoInlineEdit(previewHtml, field, updated)')
    }
    expect(portalEditor).toContain("const portalSlug = searchParams.get('portalSlug')")
    expect(portalEditor).toContain('inlineEdits,')
  })
})
