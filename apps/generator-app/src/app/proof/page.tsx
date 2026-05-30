'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

const testimonials = [
  {
    quote: 'We filled four new client slots in the first week after launch.',
    name: 'Logan P.',
    company: 'Evergreen Wellness Co.',
  },
  {
    quote: 'The platform looks premium and the mobile calls-to-action convert.',
    name: 'Alana G.',
    company: 'Stillwater Holistic',
  },
  {
    quote: 'Finally a system that feels built for practitioners, not generic SaaS.',
    name: 'Micah R.',
    company: 'Harmony Sound Bath',
  },
  {
    quote: 'Inquiries doubled once our booking flow went live on mobile.',
    name: 'Priya S.',
    company: 'Lumen Aromatherapy',
  },
]

export default function ProofPage() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const swipeHandled = useRef(false)

  useEffect(() => {
    if (isPaused) {
      return
    }
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [isPaused])

  const active = testimonials[activeIndex]
  const swipeThreshold = 40

  return (
    <main className="min-h-screen pt-24 pb-20">
      <section className="container-wide py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <span className="signal-chip">Proof</span>
            <h1 className="text-5xl md:text-6xl font-bold text-bright-white">
              Results that convert for wellness businesses
            </h1>
            <p className="text-xl text-slate-200 max-w-2xl">
              We build platforms that feel premium on mobile, surface bookings fast, and
              turn clicks into new clients.
            </p>
            <div className="flex flex-wrap gap-6 text-sm text-slate-300">
              <span>⚡ 48-hour average launch</span>
              <span>📈 Conversion-first layouts</span>
              <span>🔐 Portal edits included</span>
            </div>
          </div>
          <div className="glass-panel rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white">Pilot metrics</h2>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="stat-card">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Inquiries</p>
                <p className="text-3xl font-bold text-white">+32%</p>
              </div>
              <div className="stat-card">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Bookings</p>
                <p className="text-3xl font-bold text-white">+28%</p>
              </div>
              <div className="stat-card">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Bounce</p>
                <p className="text-3xl font-bold text-white">-21%</p>
              </div>
              <div className="stat-card">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Speed</p>
                <p className="text-3xl font-bold text-white">94</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-wide pb-20">
        <div
          className="glass-panel rounded-3xl p-10"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <h2 className="text-3xl font-bold text-white mb-6">Before & after snapshots</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-4">
                <div className="card-mahogany">
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-3">
                    Before
                  </div>
                  <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden">
                    <Image
                      src={`/images/proof-${i}.jpg`}
                      alt={`Before site ${i}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 33vw"
                    />
                  </div>
                </div>
                <div className="card-mahogany">
                  <div className="text-xs uppercase tracking-[0.3em] text-cyan-200 mb-3">
                    After
                  </div>
                  <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden">
                    <Image
                      src={`/images/proof-${i + 3}.jpg`}
                      alt={`After site ${i}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 33vw"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-wide pb-20">
        <div className="glass-panel rounded-3xl p-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h2 className="text-3xl font-bold text-white">What clients say</h2>
              <p className="text-slate-300 mt-2">
                Rotating highlights from early pilots and launch partners.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setActiveIndex((prev) =>
                    prev === 0 ? testimonials.length - 1 : prev - 1
                  )
                }
                className="px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/10"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() =>
                  setActiveIndex((prev) => (prev + 1) % testimonials.length)
                }
                className="px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/10"
              >
                Next
              </button>
            </div>
          </div>

          <div
            className="mt-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_240px] gap-8 items-center"
            onTouchStart={(event) => {
              setIsPaused(true)
              touchStartX.current = event.touches[0]?.clientX ?? null
              swipeHandled.current = false
            }}
            onTouchMove={(event) => {
              if (swipeHandled.current || touchStartX.current === null) {
                return
              }
              const currentX = event.touches[0]?.clientX ?? touchStartX.current
              const deltaX = currentX - touchStartX.current
              if (Math.abs(deltaX) < swipeThreshold) {
                return
              }
              swipeHandled.current = true
              if (deltaX > 0) {
                setActiveIndex((prev) =>
                  prev === 0 ? testimonials.length - 1 : prev - 1
                )
              } else {
                setActiveIndex((prev) => (prev + 1) % testimonials.length)
              }
            }}
            onTouchEnd={() => {
              setIsPaused(false)
              touchStartX.current = null
              swipeHandled.current = false
            }}
          >
            <div className="card-mahogany space-y-4">
              <p className="text-2xl text-slate-100 leading-relaxed">&ldquo;{active.quote}&rdquo;</p>
              <div>
                <p className="text-white font-semibold text-lg">{active.name}</p>
                <p className="text-sm text-slate-400">{active.company}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {testimonials.map((item, index) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`text-left p-3 rounded-xl border text-xs uppercase tracking-[0.2em] transition-all ${
                    index === activeIndex
                      ? 'border-cyan-300 text-cyan-200 bg-white/10'
                      : 'border-white/10 text-slate-400 hover:bg-white/5'
                  }`}
                >
                  {item.company}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-wide pb-20">
        <div className="glass-panel rounded-3xl p-12 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to build yours?
          </h2>
          <p className="text-lg text-slate-200 mb-8 max-w-2xl mx-auto">
            Browse templates in your niche, preview the full site, and launch when you&apos;re ready.
          </p>
          <Link href="/#niches" className="cta-button">
            View Custom Templates
          </Link>
        </div>
      </section>
    </main>
  )
}
