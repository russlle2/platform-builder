'use client'

import { useId } from 'react'
import Link from 'next/link'
import { getLaunchReviewPages, getNicheLaunchReview } from '@/lib/niche-launch-review'

export function NicheLaunchReview({
  niche,
  previewPages,
  onPreviewPage,
}: {
  niche?: string
  previewPages?: readonly string[]
  onPreviewPage?: (page: string) => void
}) {
  const descriptionId = useId()
  const review = getNicheLaunchReview(niche)
  const pages = onPreviewPage ? getLaunchReviewPages(previewPages) : []

  return (
    <details className="border-t border-white/10 pt-4 text-sm text-slate-300">
      <summary className="cursor-pointer rounded-lg py-2 text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300">
        <h3 className="inline font-semibold">Before you publish</h3>
        <span className="mt-1 block text-sm font-normal text-slate-400">5 manual checks for {review.practiceLabel}</span>
      </summary>
      <p id={descriptionId} className="mt-3 text-slate-400">
        Review these yourself; they are separate from your details-completeness percentage.
        Check the finished site again whenever you change its content or contact setup.
      </p>
      <ol aria-describedby={descriptionId} className="mt-4 list-decimal space-y-5 pl-5">
        <li className="pl-1">
          <h4 className="font-semibold text-slate-100">Does every page describe your real practice?</h4>
          <p className="mt-1 leading-relaxed">Replace sample text, photos, and contact details with your own. Check that every claim and qualification is accurate and yours to use. Remove example testimonials rather than presenting them as client feedback.</p>
        </li>
        {review.questions.map(({ question, action }) => (
          <li key={question} className="pl-1">
            <h4 className="font-semibold text-slate-100">{question}</h4>
            <p className="mt-1 leading-relaxed">{action}</p>
          </li>
        ))}
        <li className="pl-1">
          <h4 className="font-semibold text-slate-100">Can a visitor complete the next step?</h4>
          <p className="mt-1 leading-relaxed">The preview cannot confirm message delivery or a live booking. On your connected website, try this path before sharing it:</p>
          <ol className="mt-2 list-decimal space-y-2 pl-5 leading-relaxed">
            <li>Open the homepage on a phone and follow the main contact or booking link.</li>
            <li>Check that email or phone links open the correct address or number. If you use a form, send clearly labeled test details with an email address you control and confirm the enquiry reaches you.</li>
            <li>If you connect a booking provider, make a test appointment and check confirmation and cancellation. Test any payment step only in your provider’s test mode.</li>
            <li>If a step is not set up, use a working contact option and explain what happens next.</li>
          </ol>
        </li>
      </ol>
      {pages.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold text-slate-300">Review pages in your preview</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {pages.map(({ page, label }) => (
              <button key={page} type="button" onClick={() => onPreviewPage?.(page)}
                className="rounded-lg border border-white/20 px-3 py-2 text-sm text-cyan-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
                aria-label={`Open ${label.toLowerCase()} in preview`}>
                {label} <span aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <Link href="/wellness-website-checklist" className="mt-5 inline-block rounded py-2 font-semibold text-cyan-200 underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
        Read the full website checklist
      </Link>
    </details>
  )
}
