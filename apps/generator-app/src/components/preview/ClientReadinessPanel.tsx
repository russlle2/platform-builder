'use client'

import {
  categoryPercent,
  type ClientReadinessResult,
} from '@/lib/client-readiness'
import { NicheLaunchReview } from '@/components/preview/NicheLaunchReview'

function scoreTone(overall: number): { ring: string; label: string } {
  if (overall === 100) return { ring: 'text-emerald-400', label: 'Details supplied' }
  if (overall >= 70) return { ring: 'text-cyan-400', label: 'A few details left' }
  return { ring: 'text-amber-400', label: 'Build your introduction at your own pace' }
}

export function ClientReadinessPanel({
  result,
  compact = false,
  niche,
  previewPages,
  onPreviewPage,
}: {
  result: ClientReadinessResult
  compact?: boolean
  niche?: string
  previewPages?: readonly string[]
  onPreviewPage?: (page: string) => void
}) {
  const tone = scoreTone(result.overall)

  return (
    <div className={`glass-panel rounded-2xl border border-white/10 ${compact ? 'p-5' : 'p-8'} space-y-6`}>
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <div
            className={`relative flex shrink-0 items-center justify-center rounded-full border-4 border-white/10 bg-white/5 ${compact ? 'w-20 h-20' : 'w-24 h-24'}`}
            role="img"
            aria-label={`Website details ${result.overall} percent complete`}
          >
            <span className={`text-2xl font-bold ${tone.ring}`}>{result.overall}%</span>
          </div>
          <div className="min-w-0">
            <h2 className={`font-bold text-white ${compact ? 'text-lg' : 'text-2xl'}`}>
              Your website details
            </h2>
            <p className={`text-slate-400 mt-1 ${compact ? 'text-xs max-w-xs' : 'text-sm max-w-md'}`}>
              A completeness check of the information and style choices you’ve supplied.
              It does not verify credentials, test booking, or predict enquiries.
            </p>
            <p className={`text-xs mt-2 ${tone.ring}`}>{tone.label}</p>
          </div>
        </div>

        <div className={`grid gap-3 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'}`}>
          {result.categories.map((cat) => {
            const pct = categoryPercent(cat)
            return (
              <div key={cat.id} className="rounded-xl bg-white/5 border border-white/10 px-3 py-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-200">{cat.label}</span>
                  <span className="text-xs text-slate-400">{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 motion-reduce:transition-none"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {result.suggestions.length > 0 && (
        <div className="border-t border-white/10 pt-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Details to add or review
          </h3>
          <ul className={`space-y-2 ${compact ? 'text-sm' : ''}`}>
            {result.suggestions.map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-slate-300">
                <span className="text-cyan-400 mt-0.5 shrink-0" aria-hidden="true">→</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <NicheLaunchReview niche={niche} previewPages={previewPages} onPreviewPage={onPreviewPage} />
    </div>
  )
}
