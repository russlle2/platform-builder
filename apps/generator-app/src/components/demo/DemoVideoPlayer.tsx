'use client'

import { useState } from 'react'
import Link from 'next/link'

type DemoVideoPlayerProps = {
  src: string
  title: string
  poster?: string
}

export function DemoVideoPlayer({
  src,
  title,
  poster = '/images/template-bg-1.jpg',
}: DemoVideoPlayerProps) {
  const [missing, setMissing] = useState(false)

  if (missing) {
    return (
      <div className="aspect-video flex flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center border-b border-white/10">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-2xl">
          ▶
        </div>
        <div className="space-y-2 max-w-md">
          <p className="text-white font-semibold">{title}</p>
          <p className="text-sm text-slate-400">
            Walkthrough video is not uploaded yet ({src}). You can still explore the flow in the
            preview wizard.
          </p>
        </div>
        <Link
          href="/preview-your-business"
          className="px-6 py-3 text-sm font-bold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white border border-cyan-200/40"
        >
          Build My Preview
        </Link>
      </div>
    )
  }

  return (
    <video
      className="w-full aspect-video bg-slate-950"
      controls
      playsInline
      preload="metadata"
      poster={poster}
      title={title}
      onError={() => setMissing(true)}
    >
      <source src={src} type="video/mp4" />
      Your browser does not support embedded video.
    </video>
  )
}
