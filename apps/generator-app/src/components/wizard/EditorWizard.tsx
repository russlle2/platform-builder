'use client';

import React, { useState, useCallback } from 'react';

interface WizardData {
  businessName: string;
  businessType: string;
  phone: string;
  email: string;
  address: string;
  services: string;
  description: string;
  accentColor: string;
  headingFont: string;
  bodyFont: string;
  heroStyle: string;
  backgroundPreference: string;
  templateId: string;
  logoImage: string;
  heroImage: string;
  backgroundImage: string;
  galleryImages: string[];
}

const INITIAL_DATA: WizardData = {
  businessName: '',
  businessType: 'hvac',
  phone: '',
  email: '',
  address: '',
  services: '',
  description: '',
  accentColor: '#d97706',
  headingFont: 'Inter',
  bodyFont: 'Inter',
  heroStyle: 'clean and modern',
  backgroundPreference: 'industrial metal',
  templateId: 'hvac-pro',
  logoImage: '/images/placeholder-logo.png',
  heroImage: '/images/template-bg-1.jpg',
  backgroundImage: '/images/hvac-condenser.jpg',
  galleryImages: [],
};

const AUTO_FILL_DATA: Partial<WizardData> = {
  businessName: 'Pro HVAC Services',
  phone: '(555) 123-4567',
  email: 'contact@prohvac.com',
  address: '123 Industrial Blvd, Suite 100',
  services: 'AC Repair, Heating Installation, Duct Cleaning, Plumbing',
  description: 'Professional HVAC and plumbing services with 20+ years of experience.',
};

const TEMPLATES = [
  { id: 'hvac-pro', name: 'HVAC Professional', bg: '/images/template-bg-1.jpg' },
  { id: 'hvac-modern', name: 'Modern HVAC', bg: '/images/template-bg-2.jpg' },
  { id: 'plumbing-classic', name: 'Classic Plumbing', bg: '/images/template-bg-3.jpg' },
  { id: 'industrial', name: 'Industrial Pro', bg: '/images/template-bg-4.jpg' },
  { id: 'hvac-elite', name: 'Elite HVAC', bg: '/images/template-bg-5.jpg' },
  { id: 'plumbing-modern', name: 'Modern Plumbing', bg: '/images/template-bg-6.jpg' },
];

const ACCENT_COLORS = [
  { name: 'Amber', value: '#d97706' },
  { name: 'Deep Blue', value: '#1d4ed8' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Purple', value: '#7c3aed' },
  { name: 'Slate', value: '#475569' },
];

const STEPS = [
  { id: 1, title: 'Business Info' },
  { id: 2, title: 'Services & Description' },
  { id: 3, title: 'Template & Style' },
  { id: 4, title: 'Images & Media' },
  { id: 5, title: 'Review & Finish' },
];

export function EditorWizard() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(INITIAL_DATA);
  const [autoFill, setAutoFill] = useState(false);
  const [templateIndex, setTemplateIndex] = useState(0);

  const updateField = useCallback(
    <K extends keyof WizardData>(field: K, value: WizardData[K]) => {
      setData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleAutoFill = useCallback(
    (enabled: boolean) => {
      setAutoFill(enabled);
      if (enabled) {
        setData((prev) => {
          const next = { ...prev };
          for (const [key, value] of Object.entries(AUTO_FILL_DATA)) {
            const k = key as keyof WizardData;
            if (!prev[k] || prev[k] === INITIAL_DATA[k]) {
              (next as Record<string, unknown>)[k] = value;
            }
          }
          return next as WizardData;
        });
      }
    },
    []
  );

  const prevTemplate = () => {
    const idx = templateIndex > 0 ? templateIndex - 1 : TEMPLATES.length - 1;
    setTemplateIndex(idx);
    updateField('templateId', TEMPLATES[idx].id);
  };

  const nextTemplate = () => {
    const idx = templateIndex < TEMPLATES.length - 1 ? templateIndex + 1 : 0;
    setTemplateIndex(idx);
    updateField('templateId', TEMPLATES[idx].id);
  };

  const currentTemplate = TEMPLATES[templateIndex];

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4 px-4">
      {/* LEFT PANEL — Guided questions */}
      <div className="w-1/2 flex flex-col bg-gradient-to-br from-amber-900 via-amber-800 to-yellow-900 rounded-2xl border border-amber-700/30 shadow-2xl overflow-hidden">
        {/* Header with progress */}
        <div className="px-6 py-4 border-b border-amber-700/30">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">{STEPS[step - 1].title}</h2>
            <span className="text-amber-300 text-sm font-medium">Step {step} of {STEPS.length}</span>
          </div>
          <div className="mt-3 h-1.5 bg-amber-950 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${(step / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Auto-fill toggle */}
        <div className="px-6 py-3 border-b border-amber-700/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                role="switch"
                aria-checked={autoFill}
                onClick={() => handleAutoFill(!autoFill)}
                className={`relative w-10 h-5 rounded-full transition-colors ${autoFill ? 'bg-amber-400' : 'bg-gray-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${autoFill ? 'translate-x-5' : ''}`} />
              </button>
              <span className="text-white text-sm">Auto-fill suggested missing fields</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto px-6 py-6 space-y-5">
          {step === 1 && (
            <>
              <InputField label="Business Name" value={data.businessName} onChange={(v) => updateField('businessName', v)} placeholder="e.g. Pro HVAC Services" />
              <SelectField label="Business Type" value={data.businessType} onChange={(v) => updateField('businessType', v)} options={[{ value: 'hvac', label: 'HVAC' }, { value: 'plumbing', label: 'Plumbing' }, { value: 'both', label: 'HVAC & Plumbing' }]} />
              <InputField label="Phone" value={data.phone} onChange={(v) => updateField('phone', v)} placeholder="(555) 123-4567" />
              <InputField label="Email" value={data.email} onChange={(v) => updateField('email', v)} placeholder="contact@yourbusiness.com" />
              <InputField label="Address" value={data.address} onChange={(v) => updateField('address', v)} placeholder="123 Main St, City, State" />
            </>
          )}

          {step === 2 && (
            <>
              <TextAreaField label="What services do you offer?" value={data.services} onChange={(v) => updateField('services', v)} placeholder="AC Repair, Heating Installation, Duct Cleaning..." />
              <TextAreaField label="Describe your business" value={data.description} onChange={(v) => updateField('description', v)} placeholder="Tell us about your business, experience, and what makes you stand out..." />
            </>
          )}

          {step === 3 && (
            <>
              {/* Template selection with arrows */}
              <div>
                <label className="block text-white font-medium text-sm mb-2">Choose Template</label>
                <div className="flex items-center space-x-3">
                  <button onClick={prevTemplate} className="p-2 bg-gray-800 rounded-lg text-white hover:bg-gray-700" aria-label="Previous template">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <div className="flex-grow text-center">
                    <div className="aspect-video rounded-xl overflow-hidden border-2 border-amber-500/50 bg-gray-800 bg-cover bg-center" style={{ backgroundImage: `url(${currentTemplate.bg})` }}>
                      <div className="w-full h-full flex items-end bg-gradient-to-t from-black/60 to-transparent p-4">
                        <span className="text-white font-medium">{currentTemplate.name}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={nextTemplate} className="p-2 bg-gray-800 rounded-lg text-white hover:bg-gray-700" aria-label="Next template">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <label className="block text-white font-medium text-sm mb-2">What accent color should your site use?</label>
                <div className="flex space-x-2">
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => updateField('accentColor', c.value)}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${data.accentColor === c.value ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Fonts */}
              <SelectField label="Heading Font" value={data.headingFont} onChange={(v) => updateField('headingFont', v)} options={[{ value: 'Inter', label: 'Inter' }, { value: 'Poppins', label: 'Poppins' }, { value: 'Roboto', label: 'Roboto' }, { value: 'Montserrat', label: 'Montserrat' }]} />
              <SelectField label="Body Font" value={data.bodyFont} onChange={(v) => updateField('bodyFont', v)} options={[{ value: 'Inter', label: 'Inter' }, { value: 'Open Sans', label: 'Open Sans' }, { value: 'Lato', label: 'Lato' }, { value: 'Roboto', label: 'Roboto' }]} />

              {/* Style questions */}
              <InputField label="What style should your hero image have?" value={data.heroStyle} onChange={(v) => updateField('heroStyle', v)} placeholder="e.g. clean and modern" />
              <InputField label="What background do you want?" value={data.backgroundPreference} onChange={(v) => updateField('backgroundPreference', v)} placeholder="e.g. industrial metal" />
            </>
          )}

          {step === 4 && (
            <>
              <ImageField label="Logo Image" value={data.logoImage} onChange={(v) => updateField('logoImage', v)} />
              <ImageField label="Hero / Foreground Image" value={data.heroImage} onChange={(v) => updateField('heroImage', v)} />
              <ImageField label="Background Image" value={data.backgroundImage} onChange={(v) => updateField('backgroundImage', v)} />
              <div>
                <label className="block text-white font-medium text-sm mb-2">Gallery Images</label>
                <div className="border-2 border-dashed border-gray-600 rounded-xl p-6 text-center text-gray-400 text-sm hover:border-amber-500 transition-colors cursor-pointer">
                  Drag &amp; drop images or click to upload gallery photos
                </div>
              </div>
            </>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div className="bg-amber-950/50 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-bold text-white">Review Your Site</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <Detail label="Business" value={data.businessName} />
                  <Detail label="Type" value={data.businessType} />
                  <Detail label="Phone" value={data.phone} />
                  <Detail label="Email" value={data.email} />
                  <Detail label="Template" value={currentTemplate.name} />
                  <Detail label="Style" value={data.heroStyle} />
                </div>
              </div>

              {/* Finish CTAs */}
              <div className="space-y-4 text-center">
                <a
                  href="/pricing"
                  className="block w-full py-4 bg-white text-amber-900 font-bold text-lg rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 text-center"
                >
                  See Transparent Pricing &amp; Reserve Your Spot
                </a>
                <a
                  href="/pricing"
                  className="inline-block text-amber-300 hover:text-amber-200 underline text-sm"
                >
                  Continue → /pricing
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer with nav buttons */}
        <div className="px-6 py-4 border-t border-amber-700/30 flex justify-between">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step <= 1}
            className="px-6 py-2 text-white border border-white/30 rounded-lg hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Back
          </button>
          {step < STEPS.length ? (
            <button
              onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}
              className="px-6 py-2 bg-white text-amber-900 font-bold rounded-lg hover:bg-gray-100 transition-all shadow-lg"
            >
              Continue
            </button>
          ) : null}
        </div>
      </div>

      {/* RIGHT PANEL — Live Preview */}
      <div className="w-1/2 flex flex-col">
        <div className="flex-grow rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50 bg-gray-900">
          {/* Browser chrome */}
          <div className="flex items-center space-x-2 px-4 py-2 bg-gray-800/80 border-b border-gray-700/50">
            <div className="flex space-x-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="flex-grow mx-4">
              <div className="bg-gray-700 rounded-md px-3 py-1 text-gray-400 text-xs">
                {data.businessName ? `${data.businessName.toLowerCase().replace(/\s+/g, '')}.com` : 'yoursite.com'}
              </div>
            </div>
          </div>

          {/* Live preview content — updates in real time */}
          <div className="relative h-full overflow-y-auto">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20"
              style={{ backgroundImage: `url(${currentTemplate.bg})` }}
            />
            <div className="relative z-10 p-6 space-y-6">
              {/* Navigation bar preview */}
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: data.accentColor + '20' }}>
                <span className="text-white font-bold" style={{ fontFamily: data.headingFont }}>
                  {data.businessName || 'Your Business Name'}
                </span>
                <div className="flex space-x-3 text-sm" style={{ fontFamily: data.bodyFont }}>
                  <span className="text-white/80">Services</span>
                  <span className="text-white/80">About</span>
                  <span className="text-white/80">Contact</span>
                </div>
              </div>

              {/* Hero section preview */}
              <div
                className="rounded-xl p-8 bg-cover bg-center relative overflow-hidden"
                style={{ backgroundImage: `url(${data.heroImage})`, minHeight: '200px' }}
              >
                <div className="absolute inset-0 bg-black/50" />
                <div className="relative z-10 space-y-3">
                  <h2 className="text-3xl font-bold text-white" style={{ fontFamily: data.headingFont }}>
                    {data.businessName || 'Your Business Name'}
                  </h2>
                  <p className="text-white" style={{ fontFamily: data.bodyFont }}>
                    {data.description || 'Your business description will appear here'}
                  </p>
                  <button className="px-6 py-2 rounded-lg text-white font-bold" style={{ backgroundColor: data.accentColor }}>
                    Get a Quote
                  </button>
                </div>
              </div>

              {/* Services preview */}
              {data.services && (
                <div className="grid grid-cols-2 gap-3">
                  {data.services.split(',').map((service, i) => (
                    <div key={i} className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/30">
                      <div className="w-8 h-8 rounded-lg mb-2" style={{ backgroundColor: data.accentColor + '30' }} />
                      <h4 className="text-white text-sm font-medium" style={{ fontFamily: data.headingFont }}>
                        {service.trim()}
                      </h4>
                    </div>
                  ))}
                </div>
              )}

              {/* Contact preview */}
              <div className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/30">
                <h3 className="text-lg font-bold text-white mb-3" style={{ fontFamily: data.headingFont }}>Contact Us</h3>
                <div className="space-y-1 text-sm" style={{ fontFamily: data.bodyFont }}>
                  {data.phone && <p className="text-white">{data.phone}</p>}
                  {data.email && <p className="text-white">{data.email}</p>}
                  {data.address && <p className="text-white">{data.address}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Helper sub-components ---- */

function InputField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-white font-medium text-sm mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2 bg-amber-950/50 border border-amber-700/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
    </div>
  );
}

function TextAreaField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-white font-medium text-sm mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full px-4 py-2 bg-amber-950/50 border border-amber-700/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="block text-white font-medium text-sm mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 bg-amber-950/50 border border-amber-700/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-white font-medium text-sm mb-2">{label}</label>
      <div className="border-2 border-dashed border-gray-600 rounded-xl p-4 hover:border-amber-500 transition-colors cursor-pointer">
        {value ? (
          <div className="relative">
            <div className="w-full h-24 bg-gray-800 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${value})` }} />
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="mt-2 w-full px-3 py-1 bg-amber-950/50 border border-amber-700/30 rounded text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="Image path"
            />
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center">Click to upload or enter image path</p>
        )}
      </div>
      {/* Optimize toggle */}
      <div className="flex items-center space-x-2 mt-2">
        <div className="relative w-8 h-4 rounded-full bg-amber-500 cursor-pointer">
          <span className="absolute top-0.5 right-0.5 w-3 h-3 bg-white rounded-full" />
        </div>
        <span className="text-white text-xs">Optimize Image</span>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-amber-300 text-xs">{label}</span>
      <p className="text-white">{value || '—'}</p>
    </div>
  );
}
