'use client'

import Image from 'next/image'

export default function ProofPage() {
  return (
    <main className="min-h-screen pt-16">
      <section className="container-hvac py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-bright-white mb-6">
            Proof of Quality
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            See what our elite members are building
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <ProofCard key={i} number={i} />
          ))}
        </div>
      </section>
    </main>
  )
}

function ProofCard({ number }: { number: number }) {
  return (
    <div className="card-mahogany space-y-4">
      <div className="relative aspect-video bg-slate-800 rounded-lg overflow-hidden">
        <Image
          src={`/images/proof-${number}.jpg`}
          alt={`Example ${number}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>
      <h3 className="text-xl font-bold text-bright-white">
        Elite HVAC Pro {number}
      </h3>
      <p className="text-gray-300 text-sm">
        Professional HVAC website built with our platform
      </p>
      <div className="flex gap-2 text-sm text-gray-400">
        <span>⚡ Fast</span>
        <span>📱 Responsive</span>
        <span>🔍 SEO Ready</span>
      </div>
    </div>
  )
}