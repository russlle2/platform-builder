'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  PAGE_DESCRIPTION_MAX_LENGTH,
  PAGE_TITLE_MAX_LENGTH,
  readEditablePageSeoSettings,
  type PageSeoField,
} from '@/lib/page-seo-settings'

export function PageSeoSettingsPanel({
  html,
  page,
  onApply,
}: {
  html: string | null
  page: string
  onApply: (field: PageSeoField, updated: string) => boolean
}) {
  const settings = useMemo(() => readEditablePageSeoSettings(html), [html])
  const [title, setTitle] = useState(settings.title?.value ?? '')
  const [description, setDescription] = useState(settings.description?.value ?? '')
  const [status, setStatus] = useState('')

  useEffect(() => {
    setTitle(settings.title?.value ?? '')
    setDescription(settings.description?.value ?? '')
    setStatus('')
  }, [page, settings.title?.nodeId, settings.title?.value, settings.description?.nodeId, settings.description?.value])

  const titleChanged = Boolean(settings.title && title !== settings.title.value)
  const descriptionChanged = Boolean(settings.description && description !== settings.description.value)
  const canApply = titleChanged || descriptionChanged
  const pageLabel = page.replace(/\.html$/i, '').replace(/[-_]/g, ' ') || 'home'

  const apply = () => {
    let applied = 0
    if (titleChanged && onApply('title', title)) applied += 1
    if (descriptionChanged && onApply('description', description)) applied += 1
    setStatus(applied > 0 ? `Saved ${applied === 2 ? 'both settings' : 'setting'} for this page.` : 'No safe changes were applied.')
  }

  return (
    <div className="glass-panel rounded-xl p-4 mb-4" data-page-seo-settings>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-bold text-white">Page &amp; SEO Settings</h3>
          <p className="text-xs text-slate-400 mt-1">
            Search and browser text for <span className="font-mono text-slate-300">{pageLabel}</span>. Each page has its own settings.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Current page
        </span>
      </div>

      {(!settings.title || !settings.description) && (
        <p className="mb-3 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
          {!settings.title && !settings.description
            ? 'This page does not expose verified compiler SEO slots.'
            : 'One SEO slot is unavailable because its verified compiler annotation is missing.'}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 flex items-center justify-between gap-2 text-xs font-semibold text-slate-300">
            Page title
            <span className="font-normal text-slate-500">{title.length}/{PAGE_TITLE_MAX_LENGTH}</span>
          </span>
          <input
            type="text"
            name="page-title"
            value={title}
            maxLength={PAGE_TITLE_MAX_LENGTH}
            disabled={!settings.title}
            onChange={(event) => setTitle(event.target.value)}
            autoComplete="off"
            className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-45"
          />
        </label>
        <label className="block">
          <span className="mb-1 flex items-center justify-between gap-2 text-xs font-semibold text-slate-300">
            Search description
            <span className="font-normal text-slate-500">{description.length}/{PAGE_DESCRIPTION_MAX_LENGTH}</span>
          </span>
          <textarea
            name="page-description"
            value={description}
            maxLength={PAGE_DESCRIPTION_MAX_LENGTH}
            rows={2}
            disabled={!settings.description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full resize-y rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-45"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500" role="status" aria-live="polite">{status}</p>
        <button
          type="button"
          onClick={apply}
          disabled={!canApply}
          className="rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-4 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Apply to this page
        </button>
      </div>
    </div>
  )
}
