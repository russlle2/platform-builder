'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ImageUploadWithOptimize } from '@/components/ImageUploadWithOptimize'

interface WizardData {
  businessName: string
  businessType: 'hvac'
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
  customInfo: { label: string; value: string }[]
  subdomainSlug: string
}

const wizardSteps = [
  'Business Info',
  'Services',
  'Branding',
  'Media',
  'Template',
  'Review',
]

const stepMeta = [
  {
    title: 'Business Info',
    description: 'Core identity, subdomain, and the details that set you apart.',
  },
  {
    title: 'Services',
    description: 'Select your service mix and contact details for the site.',
  },
  {
    title: 'Branding',
    description: 'Define color and tone so the build feels like you.',
  },
  {
    title: 'Media',
    description: 'Upload the hero, logo, and background imagery.',
  },
  {
    title: 'Template',
    description: 'Pick the structure and style that shapes your live site experience.',
  },
  {
    title: 'Review',
    description: 'Review your full website preview before checkout and launch.',
  },
]

const templatePresets = [
  {
    id: 'service-first',
    name: 'Service First',
    summary: 'Lead with emergency response and fast booking actions.',
    structure: 'Hero with urgent CTA, then services and trust badges.',
    purpose: 'Built to convert repair-intent visitors quickly.',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    heroImage: '/images/hvac-condenser.jpg',
    backgroundImage: '/images/hvac-background.jpg',
  },
  {
    id: 'premium-trust',
    name: 'Premium Trust',
    summary: 'Show authority, craftsmanship, and premium positioning.',
    structure: 'Story-led hero, social proof, and financing highlights.',
    purpose: 'Best for high-ticket installs and replacement projects.',
    headingFont: 'Poppins',
    bodyFont: 'Inter',
    heroImage: '/images/hvac-condenser.jpg',
    backgroundImage: '/images/hvac-condenser.jpg',
  },
  {
    id: 'neighborhood-comfort',
    name: 'Neighborhood Comfort',
    summary: 'Friendly local look focused on seasonal maintenance plans.',
    structure: 'Simple hero, maintenance plan section, and contact strip.',
    purpose: 'Great for recurring tune-up and maintenance memberships.',
    headingFont: 'Nunito',
    bodyFont: 'Nunito',
    heroImage: '/images/hvac-background.jpg',
    backgroundImage: '/images/hvac-background.jpg',
  },
] as const

type TemplatePreset = (typeof templatePresets)[number]

const getTemplatePreset = (templateId: string): TemplatePreset => {
  return templatePresets.find((preset) => preset.id === templateId) || templatePresets[0]
}

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
    template: templatePresets[0].id,
    accentColor: '#2563eb',
    headingFont: templatePresets[0].headingFont,
    bodyFont: templatePresets[0].bodyFont,
    heroImage: templatePresets[0].heroImage,
    logo: '/images/logo-placeholder.png',
    backgroundImage: templatePresets[0].backgroundImage,
    galleryImages: [],
    autoFill: false,
    customInfo: [],
    subdomainSlug: '',
  })

  const stepInfo = stepMeta[currentStep]
  const businessNameMissing = !wizardData.businessName.trim()
  const canContinue = currentStep === 0 ? !businessNameMissing : true

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
    <main className="min-h-screen pt-24 pb-16">
      <div className="container-hvac py-8 space-y-10">
        <header className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <span className="signal-chip">Build Wizard</span>
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              Launch your HVAC platform in minutes
            </h1>
            <p className="text-slate-300 text-lg">
              Every answer feeds your site, your subdomain, and your integrations. Only the
              business name is required to move forward.
            </p>
          </div>
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Progress</p>
              <p className="text-sm text-cyan-200">Step {currentStep + 1} of {wizardSteps.length}</p>
            </div>
            <div className="flex items-center gap-2">
              {wizardSteps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 flex-1 rounded-full ${
                    index <= currentStep ? 'bg-cyan-400' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>
        </header>
        {/* Progress Bar */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex flex-wrap gap-4">
            {wizardSteps.map((step, index) => (
              <div
                key={step}
                className="flex items-center gap-3"
              >
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${
                    index === currentStep
                      ? 'bg-cyan-400 text-slate-900'
                      : index < currentStep
                      ? 'bg-white/20 text-white'
                      : 'bg-white/5 text-slate-400'
                  }`}
                >
                  {index + 1}
                </div>
                <div className="text-sm font-semibold text-slate-200">{step}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8">
          <div className="mahogany-surface rounded-2xl p-8 h-fit">
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Step {currentStep + 1}</p>
              <h2 className="text-3xl font-bold text-bright-white mt-2">
                {stepInfo.title}
              </h2>
              <p className="text-slate-200 mt-2">
                {stepInfo.description}
              </p>
            </div>

            {currentStep === 0 && (
              <BusinessInfoStep data={wizardData} updateData={updateData} />
            )}
            {currentStep === 1 && (
              <ServicesStep data={wizardData} updateData={updateData} />
            )}
            {currentStep === 2 && (
              <BrandingStep data={wizardData} updateData={updateData} />
            )}
            {currentStep === 3 && (
              <MediaStep data={wizardData} updateData={updateData} />
            )}
            {currentStep === 4 && (
              <TemplateStep data={wizardData} updateData={updateData} />
            )}
            {currentStep === 5 && (
              <ReviewStep data={wizardData} />
            )}

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-8 pt-6 border-t border-white/10 gap-4">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                ← Back
              </button>

              {businessNameMissing && currentStep === 0 && (
                <span className="text-sm text-amber-200">
                  Add your business name to continue.
                </span>
              )}

              {currentStep < wizardSteps.length - 1 ? (
                <button
                  onClick={nextStep}
                  disabled={!canContinue}
                  className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue →
                </button>
              ) : (
                <Link
                  href={
                    wizardData.subdomainSlug
                      ? `/pricing?slug=${encodeURIComponent(wizardData.subdomainSlug)}`
                      : '/pricing'
                  }
                  className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all inline-block"
                >
                  See Transparent Pricing & Reserve Your Spot
                </Link>
              )}
            </div>
          </div>
            <aside className="glass-panel rounded-2xl p-6 h-fit sticky top-24 space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Build status</p>
                <h3 className="text-2xl font-bold text-white mt-2">Ready to launch</h3>
                <p className="text-slate-300 mt-2">
                  Your inputs are shaping the final site and subdomain reservation.
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-200">
                  <span>Business name</span>
                  <span>{wizardData.businessName ? 'Added' : 'Missing'}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-200">
                  <span>Services selected</span>
                  <span>{wizardData.services.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-200">
                  <span>Template</span>
                  <span>{wizardData.template || 'Not set'}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-200">
                  <span>Subdomain</span>
                  <span>{wizardData.subdomainSlug || 'Not set'}</span>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200">
                Checkout activates hosting, email, storage, and payments. You will have portal access to edit anytime.
              </div>
            </aside>
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
  const MIN_SLUG_LENGTH = 3
  const MAX_SLUG_LENGTH = 30
  const [slugStatus, setSlugStatus] = useState<{
    state: 'idle' | 'checking' | 'available' | 'unavailable' | 'invalid' | 'error'
    message?: string
  }>({ state: 'idle' })

  const normalizeSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  const validateSlug = (value: string) => {
    if (!value) {
      return null
    }
    if (value.length < MIN_SLUG_LENGTH) {
      return `Slug must be at least ${MIN_SLUG_LENGTH} characters.`
    }
    if (value.length > MAX_SLUG_LENGTH) {
      return `Slug must be ${MAX_SLUG_LENGTH} characters or fewer.`
    }
    if (!/^[a-z0-9-]+$/.test(value)) {
      return 'Use only lowercase letters, numbers, and hyphens.'
    }
    return null
  }

  const suggestSlug = () => {
    const suggestion = normalizeSlug(data.businessName)
    if (suggestion) {
      updateData('subdomainSlug', suggestion)
    }
  }

  const handleSlugChange = (value: string) => {
    updateData('subdomainSlug', normalizeSlug(value))
  }

  useEffect(() => {
    const slug = data.subdomainSlug
    const validationError = validateSlug(slug)
    if (!slug) {
      setSlugStatus({ state: 'idle' })
      return
    }
    if (validationError) {
      setSlugStatus({ state: 'invalid', message: validationError })
      return
    }

    let active = true
    setSlugStatus({ state: 'checking' })

    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/slug/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug }),
        })
        if (!response.ok) {
          throw new Error('Availability check failed')
        }
        const data = await response.json()
        if (!active) {
          return
        }
        if (data.available) {
          setSlugStatus({ state: 'available', message: 'Available' })
        } else {
          setSlugStatus({ state: 'unavailable', message: data.reason || 'Unavailable' })
        }
      } catch (error) {
        if (active) {
          setSlugStatus({ state: 'error', message: 'Unable to check availability.' })
        }
      }
    }, 500)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [data.subdomainSlug])

  const addCustomInfo = () => {
    updateData('customInfo', [...data.customInfo, { label: '', value: '' }])
  }

  const updateCustomInfo = (index: number, key: 'label' | 'value', value: string) => {
    const next = data.customInfo.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [key]: value } : item
    )
    updateData('customInfo', next)
  }

  const removeCustomInfo = (index: number) => {
    updateData('customInfo', data.customInfo.filter((_, itemIndex) => itemIndex !== index))
  }

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
          Preferred Subdomain (optional)
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={data.subdomainSlug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="e.g., elite-heating"
            className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={suggestSlug}
            className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg"
          >
            Suggest from name
          </button>
        </div>
        <p className="text-sm text-gray-400 mt-2">
          This becomes {`{your-slug}`}.mywebsite.com. Availability updates live as you type.
        </p>
        {slugStatus.state !== 'idle' && (
          <p
            className={`text-sm mt-2 ${
              slugStatus.state === 'available'
                ? 'text-green-300'
                : slugStatus.state === 'checking'
                ? 'text-gray-300'
                : 'text-red-300'
            }`}
          >
            {slugStatus.state === 'checking' ? 'Checking availability...' : slugStatus.message}
          </p>
        )}
      </div>

      <div className="p-4 rounded-lg bg-blue-600/20 border border-blue-500/30">
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">Business Focus</p>
        <p className="text-white font-semibold mt-1">HVAC builds only</p>
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

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-white font-semibold">
            Add any extra details you want shown on your site
          </label>
          <button
            type="button"
            onClick={addCustomInfo}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg"
          >
            + Add detail
          </button>
        </div>
        {data.customInfo.length === 0 && (
          <p className="text-sm text-gray-400">
            Examples: hours, licensing, service guarantees, financing, certifications.
          </p>
        )}
        {data.customInfo.map((item, index) => (
          <div key={index} className="space-y-3 p-4 bg-white/5 rounded-lg">
            <input
              type="text"
              value={item.label}
              onChange={(e) => updateCustomInfo(index, 'label', e.target.value)}
              placeholder="Label (e.g., Hours, License, Warranty)"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={item.value}
              onChange={(e) => updateCustomInfo(index, 'value', e.target.value)}
              placeholder="Details to display on your site"
              rows={3}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => removeCustomInfo(index)}
              className="text-sm text-red-300 hover:text-red-200"
            >
              Remove detail
            </button>
          </div>
        ))}
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
  const selectedTemplate = getTemplatePreset(data.template)

  const applyTemplate = (template: TemplatePreset) => {
    updateData('template', template.id)
    updateData('headingFont', template.headingFont)
    updateData('bodyFont', template.bodyFont)
    updateData('heroImage', template.heroImage)
    updateData('backgroundImage', template.backgroundImage)
  }

  return (
    <div className="space-y-6">
      <p className="text-gray-300">
        Pick a template to set layout structure, visual style, and font personality for your HVAC site.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {templatePresets.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => applyTemplate(template)}
            className={`text-left p-5 rounded-xl border transition-all ${
              data.template === template.id
                ? 'border-cyan-400 bg-cyan-500/10'
                : 'border-white/15 bg-white/5 hover:bg-white/10'
            }`}
          >
            <p className="text-white font-semibold">{template.name}</p>
            <p className="text-slate-300 text-sm mt-2">{template.summary}</p>
            <div className="text-xs text-slate-300 mt-4 space-y-1">
              <p><span className="text-cyan-200">Structure:</span> {template.structure}</p>
              <p><span className="text-cyan-200">Purpose:</span> {template.purpose}</p>
              <p><span className="text-cyan-200">Fonts:</span> {template.headingFont} + {template.bodyFont}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Selected template effects</p>
        <h4 className="text-xl font-bold text-white mt-2">{selectedTemplate.name}</h4>
        <ul className="mt-3 space-y-2 text-slate-200 text-sm">
          <li>Background image style updates to match this template.</li>
          <li>Page section order shifts to this structure: {selectedTemplate.structure}</li>
          <li>Messaging focus aligns to: {selectedTemplate.purpose}</li>
          <li>Typography switches to {selectedTemplate.headingFont} headings and {selectedTemplate.bodyFont} body text.</li>
        </ul>
      </div>
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
  const selectedTemplate = getTemplatePreset(data.template)

  return (
    <div className="space-y-6">
      <div className="p-6 bg-green-600/20 border border-green-500/30 rounded-lg">
        <h3 className="text-2xl font-bold text-bright-white mb-2">
          🎉 Your Site is Ready!
        </h3>
        <p className="text-gray-300">
          Review your details and live preview, then proceed to pricing to start your subscription and launch.
        </p>
      </div>

      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <h4 className="text-xl font-bold text-white">Live website preview</h4>
        <p className="text-sm text-slate-300">
          This preview reflects your selected template structure, fonts, and imagery.
        </p>
        <WebsitePreview data={data} />
      </div>

      <div className="glass-panel rounded-2xl p-6">
        <h4 className="text-xl font-bold text-white mb-3">What happens next</h4>
        <ul className="space-y-3 text-slate-200">
          <li>We confirm your subdomain and connect Postmark, Supabase, and Stripe.</li>
          <li>Your template is populated with your content and media.</li>
          <li>You receive portal access to edit and launch updates any time.</li>
        </ul>
      </div>

      <div className="space-y-4">
        <h4 className="text-xl font-bold text-bright-white">Summary</h4>
        <div className="space-y-3">
          <SummaryItem label="Business Name" value={data.businessName} />
          <SummaryItem label="Business Type" value="hvac" />
          <SummaryItem label="Services" value={`${data.services.length} selected`} />
          <SummaryItem label="Template" value={selectedTemplate.name} />
          <SummaryItem label="Accent Color" value={data.accentColor} />
          <SummaryItem label="Custom Details" value={`${data.customInfo.length} added`} />
          <SummaryItem label="Preferred Subdomain" value={data.subdomainSlug || 'Not set'} />
        </div>
      </div>
    </div>
  )
}

function WebsitePreview({ data }: { data: WizardData }) {
  const selectedTemplate = getTemplatePreset(data.template)
  const services = data.services.length ? data.services.slice(0, 4) : ['AC Repair', 'Heating Repair', 'Maintenance Plans', 'Emergency Service']
  const previewName = data.businessName || 'Your HVAC Business'
  const previewTagline = data.tagline || 'Reliable comfort for every season.'
  const previewDescription = data.description || selectedTemplate.purpose

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900">
      <div
        className="p-6 border-b border-white/10"
        style={{
          backgroundImage: `linear-gradient(rgba(15,23,42,0.75), rgba(15,23,42,0.75)), url(${data.backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">{selectedTemplate.name}</p>
        <h5
          className="text-2xl text-white mt-2"
          style={{ fontFamily: data.headingFont }}
        >
          {previewName}
        </h5>
        <p className="text-slate-200 mt-2" style={{ fontFamily: data.bodyFont }}>
          {previewTagline}
        </p>
        <button
          type="button"
          className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ backgroundColor: data.accentColor, color: '#ffffff' }}
        >
          Book Service Now
        </button>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4" style={{ fontFamily: data.bodyFont }}>
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Layout focus</p>
          <p className="text-slate-100">{selectedTemplate.structure}</p>
          <p className="text-slate-300 text-sm">{previewDescription}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">Featured services</p>
          <ul className="space-y-2 text-slate-100 text-sm">
            {services.map((service) => (
              <li key={service}>• {service}</li>
            ))}
          </ul>
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
