'use client'

import Image from 'next/image'
import { Button } from '@/components/Button'

const templates = [
  {
    id: 1,
    name: 'Modern Business',
    description: 'Clean and professional template for businesses',
    image: 'https://via.placeholder.com/400x300/0066cc/ffffff?text=Modern+Business',
    category: 'Business',
  },
  {
    id: 2,
    name: 'Creative Portfolio',
    description: 'Showcase your work with this stunning portfolio',
    image: 'https://via.placeholder.com/400x300/9933ff/ffffff?text=Creative+Portfolio',
    category: 'Portfolio',
  },
  {
    id: 3,
    name: 'E-commerce Store',
    description: 'Perfect template for online stores',
    image: 'https://via.placeholder.com/400x300/00cc66/ffffff?text=E-commerce+Store',
    category: 'E-commerce',
  },
  {
    id: 4,
    name: 'Blog & Magazine',
    description: 'Ideal for bloggers and content creators',
    image: 'https://via.placeholder.com/400x300/ff6633/ffffff?text=Blog+Magazine',
    category: 'Blog',
  },
  {
    id: 5,
    name: 'Landing Page',
    description: 'High-converting landing page template',
    image: 'https://via.placeholder.com/400x300/ff3366/ffffff?text=Landing+Page',
    category: 'Marketing',
  },
  {
    id: 6,
    name: 'Restaurant',
    description: 'Perfect for restaurants and cafes',
    image: 'https://via.placeholder.com/400x300/ffcc00/ffffff?text=Restaurant',
    category: 'Food',
  },
]

export default function TemplatesPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Template
          </h1>
          <p className="text-xl text-gray-600">
            Start with a professionally designed template and customize it to your needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className="relative h-48">
                <Image
                  src={template.image}
                  alt={template.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <div className="text-sm text-blue-600 mb-2">{template.category}</div>
                <h3 className="text-xl font-semibold mb-2">{template.name}</h3>
                <p className="text-gray-600 mb-4">{template.description}</p>
                <Button variant="primary" size="medium" fullWidth>
                  Use Template
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
