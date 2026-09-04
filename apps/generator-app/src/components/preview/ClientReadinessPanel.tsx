'use client'

import {
  categoryPercent,
  type ClientReadinessResult,
} from '@/lib/client-readiness'

function scoreTone(overall: number): { ring: string; label: string } {
  if (overall >= 80) return { ring: 'text-emerald-400', label: 'Strong foundation' }
  if (overall >= 55) return { ring: 'text-cyan-400', label: 'Getting there' }
  return { ring: 'text-amber-400', label: 'Room to grow' }
}

export function ClientReadinessPanel({
  result,
  compact = false,
}: {
  result: ClientReadinessResult
  compact?: boolean
}) {
  const tone = scoreTone(result.overall)

  return (
    <div className={`glass-panel rounded-2xl border border-white/10 ${compact ? 'p-5' : 'p-8'} space-y-6`}>
      <div className={`flex gap-6 ${compact ? 'flex-col sm:flex-row sm:items-center' : 'flex-col md:flex-row md:items-start'}`}>
        <div className="flex items-center gap-4 shrink-0">
          <div
            className={`relative flex items-center justify-center rounded-full border-4 border-white/10 bg-white/5 ${compact ? 'w-20 h-20' : 'w-24 h-24'}`}
            role="img"
            aria-label={`Client-readiness score ${result.overall} out of 100`}
          >
            <span className={`text-3xl font-bold ${tone.ring}`}>{result.overall}</span>
          </div>
          <div>
            <h2 className={`font-bold text-white ${compact ? 'text-lg' : 'text-2xl'}`}>
              Client-Readiness Score
            </h2>
            <p className={`text-slate-400 mt-1 ${compact ? 'text-xs max-w-xs' : 'text-sm max-w-md'}`}>
              Not a vanity score. This checks whether your site has the pieces visitors need before they
              contact you.
            </p>
            <p className={`text-xs mt-2 ${tone.ring}`}>{tone.label}</p>
          </div>
        </div>

        <div className={`flex-1 grid gap-3 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'}`}>
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
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
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
            Improve your score
          </h3>
          <ul className={`space-y-2 ${compact ? 'text-sm' : ''}`}>
            {result.suggestions.map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-slate-300">
                <span className="text-cyan-400 mt-0.5 shrink-0">→</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
