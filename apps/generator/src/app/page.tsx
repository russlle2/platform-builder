import Link from 'next/link'
import { Button } from '@/components/Button'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Website Builder Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Create stunning websites with our powerful generator
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/editor">
              <Button variant="primary" size="large">
                Start Building
              </Button>
            </Link>
            <Link href="/templates">
              <Button variant="secondary" size="large">
                Browse Templates
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            title="Drag & Drop"
            description="Intuitive drag-and-drop interface for easy website building"
            icon="🎨"
          />
          <FeatureCard
            title="Templates"
            description="Choose from a variety of professionally designed templates"
            icon="📄"
          />
          <FeatureCard
            title="Responsive"
            description="All websites are mobile-friendly and responsive by default"
            icon="📱"
          />
        </div>
      </div>
    </main>
  )
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}
