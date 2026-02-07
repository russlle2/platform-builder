'use client'

import { useState } from 'react'

interface Template {
  id: string
  name: string
  description: string
  thumbnail: string
  category: 'hvac' | 'plumbing' | 'both'
}

const templates: Template[] = [
  {
    id: 'modern-hvac',
    name: 'Modern HVAC',
    description: 'Clean, professional design for HVAC companies',
    thumbnail: '/images/template-modern-hvac.jpg',
    category: 'hvac',
  },
  {
    id: 'industrial-pro',
    name: 'Industrial Pro',
    description: 'Bold, industrial aesthetic for established businesses',
    thumbnail: '/images/template-industrial.jpg',
    category: 'hvac',
  },
  {
    id: 'comfort-classic',
    name: 'Comfort Classic',
    description: 'Warm, welcoming design that builds trust',
    thumbnail: '/images/template-comfort.jpg',
    category: 'both',
  },
  {
    id: 'plumbing-elite',
    name: 'Plumbing Elite',
    description: 'Premium design for plumbing professionals',
    thumbnail: '/images/template-plumbing.jpg',
    category: 'plumbing',
  },
  {
    id: 'emergency-ready',
    name: 'Emergency Ready',
    description: '24/7 service focus with high-visibility CTAs',
    thumbnail: '/images/template-emergency.jpg',
    category: 'both',
  },
  {
    id: 'residential-focus',
    name: 'Residential Focus',
    description: 'Family-friendly design for residential services',
    thumbnail: '/images/template-residential.jpg',
    category: 'both',
  },
]

interface TemplateSelectorProps {
  selected: string
  onSelect: (templateId: string) => void
}

export function TemplateSelector({ selected, onSelect }: TemplateSelectorProps) {
  const [currentIndex, setCurrentIndex] = useState(
    templates.findIndex(t => t.id === selected) || 0
  )

  const handlePrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : templates.length - 1
    setCurrentIndex(newIndex)
    onSelect(templates[newIndex].id)
  }

  const handleNext = () => {
    const newIndex = currentIndex < templates.length - 1 ? currentIndex + 1 : 0
    setCurrentIndex(newIndex)
    onSelect(templates[newIndex].id)
  }

  const currentTemplate = templates[currentIndex]

  return (
    <div className="space-y-6">
      {/* Main Template Display */}
      <div className="relative">
        <div className="aspect-video rounded-lg overflow-hidden bg-slate-800 border-2 border-white/10">
          <img
            src={currentTemplate.thumbnail}
            alt={currentTemplate.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={handlePrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/70 hover:bg-black/90 text-white rounded-full flex items-center justify-center transition-all hover:scale-110"
        >
          ←
        </button>
        <button
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/70 hover:bg-black/90 text-white rounded-full flex items-center justify-center transition-all hover:scale-110"
        >
          →
        </button>

        {/* Template Counter */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/70 text-white rounded-full text-sm font-medium">
          {currentIndex + 1} / {templates.length}
        </div>
      </div>

      {/* Template Info */}
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold text-bright-white">
          {currentTemplate.name}
        </h3>
        <p className="text-gray-300">
          {currentTemplate.description}
        </p>
        <div className="inline-block px-3 py-1 bg-blue-600/30 border border-blue-500 rounded-full text-sm text-blue-300 capitalize">
          {currentTemplate.category}
        </div>
      </div>

      {/* Template Grid (Thumbnails) */}
      <div className="grid grid-cols-3 gap-3">
        {templates.map((template, index) => (
          <button
            key={template.id}
            onClick={() => {
              setCurrentIndex(index)
              onSelect(template.id)
            }}
            className={`aspect-video rounded-lg overflow-hidden border-2 transition-all ${
              index === currentIndex
                ? 'border-blue-500 ring-2 ring-blue-500/50'
                : 'border-white/10 hover:border-white/30'
            }`}
          >
            <img
              src={template.thumbnail}
              alt={template.name}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  )
}
