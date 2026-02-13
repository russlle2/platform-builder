'use client'

import Image from 'next/image'

export default function ArchivePage() {
  return (
    <main className="min-h-screen pt-16">
      <section className="container-hvac py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-bright-white mb-6">
            Template Archive
          </h1>
          <p className="text-xl text-gray-300">
            Browse all available templates
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      </section>
    </main>
  )
}

const templates = [
  { id: 1, name: 'Modern HVAC', category: 'HVAC' },
  { id: 2, name: 'Industrial Pro', category: 'HVAC' },
  { id: 3, name: 'Comfort Classic', category: 'HVAC' },
  { id: 4, name: 'Emergency Ready', category: 'HVAC' },
  { id: 5, name: 'Residential Focus', category: 'HVAC' },
  { id: 7, name: 'Commercial Grade', category: 'HVAC' },
  { id: 8, name: 'Service Pro', category: 'HVAC' },
  { id: 9, name: 'Maintenance Pro', category: 'HVAC' },
]

function TemplateCard({ template }: { template: typeof templates[0] }) {
  return (
    <div className="card-mahogany space-y-4 hover:scale-105 transition-transform">
      <div className="aspect-video bg-slate-800 rounded-lg overflow-hidden relative">
        <Image 
          src={`/images/template-${template.id}.jpg`} 
          alt={template.name}
          fill
          className="object-cover"
        />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-bright-white">{template.name}</h3>
        <span className="inline-block px-3 py-1 bg-blue-600/30 border border-blue-500 rounded-full text-sm text-blue-300">
          {template.category}
        </span>
      </div>
      <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
        Use Template
      </button>
    </div>
  )
}
