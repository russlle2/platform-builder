'use client'

import Image from 'next/image'
import Link from 'next/link'
import { track } from '@/lib/analytics'

const templates = [
  {
    id: 1,
    name: 'Modern HVAC',
    description: 'Premium, conversion-focused layout built for service calls.',
    image: '/images/template-1.jpg',
    category: 'HVAC',
  },
  {
    id: 2,
    name: 'Emergency Response',
    description: 'Urgent callouts and trust-focused sections.',
    image: '/images/template-2.jpg',
    category: 'HVAC',
  },
  {
    id: 3,
    name: 'Residential Comfort',
    description: 'Warm and modern layout for residential service brands.',
    image: '/images/template-3.jpg',
    category: 'HVAC',
  },
  {
    id: 4,
    name: 'Commercial Pro',
    description: 'Built for larger commercial HVAC contracts.',
    image: '/images/template-4.jpg',
    category: 'HVAC',
  },
  {
    id: 5,
    name: 'Plumbing Hybrid',
    description: 'Dual-service layout for HVAC + plumbing providers.',
    image: '/images/template-5.jpg',
    category: 'Hybrid',
  },
  {
    id: 6,
    name: 'Luxury Service',
    description: 'High-end design for premium service positioning.',
    image: '/images/template-6.jpg',
    category: 'HVAC',
  },
]

export default function TemplatesPage() {
  return (
    <main className="min-h-screen pt-24 pb-20">
      <div className="container-hvac">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center mb-12">
          <div className="space-y-6">
            <span className="signal-chip">Templates</span>
            <h1 className="text-5xl md:text-6xl font-bold text-white">
              Pick a layout built for HVAC conversions
            </h1>
            <p className="text-lg text-slate-300 max-w-2xl">
              These are placeholders until tomorrow&apos;s full library arrives. Each one maps
              your intake data into a launch-ready structure.
            </p>
          </div>
          <div className="glass-panel rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white">Template standards</h2>
            <ul className="mt-4 space-y-3 text-slate-200">
              <li>Mobile-first CTA placement</li>
              <li>SEO-ready service sections</li>
              <li>Trust + review blocks baked in</li>
              <li>Easy updates from the portal</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {templates.map((template) => (
            <div
              key={template.id}
              className="card-mahogany overflow-hidden hover:scale-[1.01] transition-transform"
            >
              <div className="relative h-48">
                <Image
                  src={template.image}
                  alt={template.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <div className="p-6 space-y-4">
                <div className="text-xs uppercase tracking-[0.3em] text-cyan-200">
                  {template.category}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">{template.name}</h3>
                  <p className="text-slate-300 text-sm mt-2">{template.description}</p>
                </div>
                <Link
                  href="/wizard"
                  onClick={() => track('template_selected', { template: template.name })}
                  className="cta-button w-full text-center"
                >
                  Use Template
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
