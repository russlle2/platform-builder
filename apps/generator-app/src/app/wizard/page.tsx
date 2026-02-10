'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ImageUploadWithOptimize } from '@/components/ImageUploadWithOptimize'
import { LivePreview } from '@/components/LivePreview'
import { TemplateSelector } from '@/components/TemplateSelector'

interface WizardData {
  businessName: string
  businessType: 'hvac' | 'plumbing' | 'both'
  tagline: string
  description: string
  services: string[]
  phoneNumber: string
  email: string
  address: string
  template: string
  accentColor: string
  headingFont: string
  bodyFont: string
  heroImage: string
  logo: string
  backgroundImage: string
  galleryImages: string[]
  autoFill: boolean
}

const wizardSteps = [
  'Business Info',
  'Services',
  'Template',
  'Branding',
  'Media',
  'Review',
]

export default function WizardPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [wizardData, setWizardData] = useState<WizardData>({
    businessName: '',
    businessType: 'hvac',
    tagline: '',
    description: '',
    services: [],
    phoneNumber: '',
    email: '',
    address: '',
    template: 'modern-hvac',
    accentColor: '#2563eb',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    heroImage: '/images/hvac-condenser.jpg',
    logo: '/images/logo-placeholder.png',
    backgroundImage: '/images/hvac-background.jpg',
    galleryImages: [],
    autoFill: false,
  })

  const updateData = (key: keyof WizardData, value: any) => {
    setWizardData((prev) => ({ ...prev, [key]: value }))
  }

  const nextStep = () => {
    if (currentStep < wizardSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <main className="min-h-screen pt-16">
      <div className="container-hvac py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {wizardSteps.map((step, index) => (
              <div
                key={step}
                className={`flex items-center ${
                  index < wizardSteps.length - 1 ? 'flex-1' : ''
                }`}
              >
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                    index <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {index + 1}
                </div>
                <div
                  className={`text-sm font-medium ml-2 ${
                    index <= currentStep ? 'text-white' : 'text-gray-500'
                  }`}
                >
                  {step}
                </div>
                {index < wizardSteps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-4 rounded ${
                      index < currentStep ? 'bg-blue-600' : 'bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content: Split Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel: Questions */}
          <div className="mahogany-surface rounded-2xl p-8 h-fit">
            <h2 className="text-3xl font-bold text-bright-white mb-6">
              {wizardSteps[currentStep]}
            </h2>

            {currentStep === 0 && (
              <BusinessInfoStep data={wizardData} updateData={updateData} />
            )}
            {currentStep === 1 && (
              <ServicesStep data={wizardData} updateData={updateData} />
            )}
            {currentStep === 2 && (
              <TemplateStep data={wizardData} updateData={updateData} />
            )}
            {currentStep === 3 && (
              <BrandingStep data={wizardData} updateData={updateData} />
            )}
            {currentStep === 4 && (
              <MediaStep data={wizardData} updateData={updateData} />
            )}
            {currentStep === 5 && (
              <ReviewStep data={wizardData} />
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                ← Back
              </button>

              {currentStep < wizardSteps.length - 1 ? (
                <button
                  onClick={nextStep}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all"
                >
                  Continue →
                </button>
              ) : (
                <Link
                  href="/pricing"
                  className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all inline-block"
                >
                  See Transparent Pricing & Reserve Your Spot
                </Link>
              )}
            </div>
          </div>

          {/* Right Panel: Live Preview */}
          <div className="preview-container p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-bright-white">
                Live Preview
              </h3>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-sm rounded">
                  Desktop
                </button>
                <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-sm rounded">
                  Mobile
                </button>
              </div>
            </div>
            <LivePreview data={wizardData} />
          </div>
        </div>
      </div>
    </main>
  )
}

// Step Components
function BusinessInfoStep({ 
  data, 
  updateData 
}: { 
  data: WizardData
  updateData: (key: keyof WizardData, value: any) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-white font-semibold mb-2">
          Business Name *
        </label>
        <input
          type="text"
          value={data.businessName}
          onChange={(e) => updateData('businessName', e.target.value)}
          placeholder="e.g., Elite HVAC Services"
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-white font-semibold mb-2">
          Business Type *
        </label>
        <div className="grid grid-cols-3 gap-3">
          {['hvac', 'plumbing', 'both'].map((type) => (
            <button
              key={type}
              onClick={() => updateData('businessType', type)}
              className={`px-4 py-3 rounded-lg font-semibold capitalize transition-all ${
                data.businessType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-white font-semibold mb-2">
          Tagline
        </label>
        <input
          type="text"
          value={data.tagline}
          onChange={(e) => updateData('tagline', e.target.value)}
          placeholder="e.g., Comfort You Can Count On"
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-white font-semibold mb-2">
          What makes your business special?
        </label>
        <textarea
          value={data.description}
          onChange={(e) => updateData('description', e.target.value)}
          placeholder="Describe your business in your own words..."
          rows={4}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center gap-3 p-4 bg-blue-600/20 border border-blue-500/30 rounded-lg">
        <input
          type="checkbox"
          checked={data.autoFill}
          onChange={(e) => updateData('autoFill', e.target.checked)}
          className="w-5 h-5"
        />
        <label className="text-white font-medium">
          Auto-fill suggested missing fields
          <span className="block text-sm text-gray-300">
            We&apos;ll suggest professional content for any empty fields. You can always change it.
          </span>
        </label>
      </div>
    </div>
  )
}

function ServicesStep({ 
  data, 
  updateData 
}: { 
  data: WizardData
  updateData: (key: keyof WizardData, value: any) => void
}) {
  const commonServices = [
    'AC Installation',
    'AC Repair',
    'Heating Installation',
    'Heating Repair',
    'Emergency Services',
    'Maintenance Plans',
    'Drain Cleaning',
    'Pipe Repair',
    'Water Heater Installation',
    'Leak Detection',
    'Commercial Services',
    '24/7 Service',
  ]

  const toggleService = (service: string) => {
    const current = data.services || []
    if (current.includes(service)) {
      updateData('services', current.filter((s) => s !== service))
    } else {
      updateData('services', [...current, service])
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-white font-semibold mb-4">
          What services do you offer? (Select all that apply)
        </label>
        <div className="grid grid-cols-2 gap-3">
          {commonServices.map((service) => (
            <button
              key={service}
              onClick={() => toggleService(service)}
              className={`px-4 py-3 rounded-lg font-medium text-left transition-all ${
                data.services.includes(service)
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {service}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-white font-semibold mb-2">
          Phone Number *
        </label>
        <input
          type="tel"
          value={data.phoneNumber}
          onChange={(e) => updateData('phoneNumber', e.target.value)}
          placeholder="(555) 123-4567"
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-white font-semibold mb-2">
          Email
        </label>
        <input
          type="email"
          value={data.email}
          onChange={(e) => updateData('email', e.target.value)}
          placeholder="contact@yourbusiness.com"
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-white font-semibold mb-2">
          Service Area
        </label>
        <input
          type="text"
          value={data.address}
          onChange={(e) => updateData('address', e.target.value)}
          placeholder="e.g., Greater Phoenix Metro Area"
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  )
}

function TemplateStep({ 
  data, 
  updateData 
}: { 
  data: WizardData
  updateData: (key: keyof WizardData, value: any) => void
}) {
  return (
    <div className="space-y-6">
      <p className="text-gray-300">
        Choose a template. Don&apos;t worry—you can switch anytime without losing your content.
      </p>
      <TemplateSelector
        selected={data.template}
        onSelect={(template) => updateData('template', template)}
      />
    </div>
  )
}

function BrandingStep({ 
  data, 
  updateData 
}: { 
  data: WizardData
  updateData: (key: keyof WizardData, value: any) => void
}) {
  const accentColors = [
    { name: 'Blue', value: '#2563eb' },
    { name: 'Red', value: '#dc2626' },
    { name: 'Green', value: '#16a34a' },
    { name: 'Orange', value: '#ea580c' },
    { name: 'Purple', value: '#9333ea' },
    { name: 'Teal', value: '#0d9488' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-white font-semibold mb-4">
          Accent Color
        </label>
        <div className="grid grid-cols-3 gap-3">
          {accentColors.map((color) => (
            <button
              key={color.value}
              onClick={() => updateData('accentColor', color.value)}
              className={`px-4 py-3 rounded-lg font-medium transition-all ${
                data.accentColor === color.value
                  ? 'ring-4 ring-white'
                  : 'hover:scale-105'
              }`}
              style={{ backgroundColor: color.value }}
            >
              <span className="text-white">{color.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-white font-semibold mb-2">
          What style should your site have?
        </label>
        <input
          type="text"
          placeholder="e.g., clean and modern, bold and professional, warm and welcoming"
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-sm text-gray-400 mt-2">
          Describe in your own words—we&apos;ll handle the technical details
        </p>
      </div>
    </div>
  )
}

function MediaStep({ 
  data, 
  updateData 
}: { 
  data: WizardData
  updateData: (key: keyof WizardData, value: any) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-white font-semibold mb-2">
          Logo
        </label>
        <ImageUploadWithOptimize
          onUpload={(url) => updateData('logo', url)}
          currentImage={data.logo}
        />
      </div>

      <div>
        <label className="block text-white font-semibold mb-2">
          Hero Image
        </label>
        <ImageUploadWithOptimize
          onUpload={(url) => updateData('heroImage', url)}
          currentImage={data.heroImage}
        />
      </div>

      <div>
        <label className="block text-white font-semibold mb-2">
          Background Image
        </label>
        <ImageUploadWithOptimize
          onUpload={(url) => updateData('backgroundImage', url)}
          currentImage={data.backgroundImage}
        />
      </div>
    </div>
  )
}

function ReviewStep({ data }: { data: WizardData }) {
  return (
    <div className="space-y-6">
      <div className="p-6 bg-green-600/20 border border-green-500/30 rounded-lg">
        <h3 className="text-2xl font-bold text-bright-white mb-2">
          🎉 Your Site is Ready!
        </h3>
        <p className="text-gray-300">
          Take a look at the preview on the right. Make any final adjustments, then proceed to pricing to reserve your spot.
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="text-xl font-bold text-bright-white">Summary</h4>
        <div className="space-y-3">
          <SummaryItem label="Business Name" value={data.businessName} />
          <SummaryItem label="Business Type" value={data.businessType} />
          <SummaryItem label="Services" value={`${data.services.length} selected`} />
          <SummaryItem label="Template" value={data.template} />
          <SummaryItem label="Accent Color" value={data.accentColor} />
        </div>
      </div>
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
      <span className="text-gray-400">{label}</span>
      <span className="text-white font-semibold">{value}</span>
    </div>
  )
}
