'use client'

import { useState } from 'react'
import Link from 'next/link'

type DemoVideoPlayerProps = {
  src: string
  title: string
  poster?: string
  captionsSrc?: string
  transcriptSrc?: string
}

export function DemoVideoPlayer({
  src,
  title,
  poster = '/images/template-bg-1.jpg',
  captionsSrc,
  transcriptSrc,
}: DemoVideoPlayerProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  return (
    <figure>
      {failedSrc === src ? (
        <div className="aspect-video flex flex-col items-center justify-center gap-4 bg-slate-950 px-6 py-8 text-center border-b border-white/10" role="status">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-2xl" aria-hidden="true">
            ▶
          </div>
          <div className="space-y-2 max-w-md">
            <p className="text-white font-semibold">{title}</p>
            <p className="text-sm text-slate-400">
              This video could not load. You can still explore the website preview.
            </p>
          </div>
          <Link
            href="/preview-your-business"
            className="px-6 py-3 text-sm font-bold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white border border-cyan-200/40"
          >
            Build My Preview
          </Link>
        </div>
      ) : (
        <video
          key={src}
          src={src}
          ref={(video) => {
            // An eager preload can fail before React attaches its event handler.
            if (video?.error) setFailedSrc(src)
          }}
          className="w-full aspect-video bg-slate-950"
          controls
          playsInline
          preload="metadata"
          poster={poster}
          title={title}
          aria-label={title}
          onError={() => setFailedSrc(src)}
        >
          {captionsSrc && (
            <track kind="captions" src={captionsSrc} srcLang="en" label="English" default />
          )}
          Your browser does not support embedded video.
        </video>
      )}
      {(captionsSrc || transcriptSrc) && (
        <figcaption className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-white/10 bg-slate-950/60 px-5 py-3 text-sm text-slate-300">
          {captionsSrc && <span>English captions available</span>}
          {transcriptSrc && (
            <a href={transcriptSrc} className="font-semibold text-cyan-300 underline underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300">
              Read the transcript
            </a>
          )}
        </figcaption>
      )}
    </figure>
  )
}
