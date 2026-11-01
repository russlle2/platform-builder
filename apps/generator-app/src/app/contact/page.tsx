'use client'

import { useState } from 'react'

export default function ContactPage() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    setStatus('submitting')
    setErrorMessage('')

    try {
      const response = await fetch('/api/forms/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: '',
          name: String(formData.get('name') || '').trim(),
          email: String(formData.get('email') || '').trim(),
          message: String(formData.get('message') || '').trim(),
        }),
      })

      const result = (await response.json().catch(() => null)) as { error?: string } | null

      if (!response.ok) {
        throw new Error(result?.error || 'We could not send your message. Please try again.')
      }

      form.reset()
      setStatus('success')
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'We could not send your message. Please try again.'
      )
      setStatus('error')
    }
  }

  return (
    <main className="min-h-screen pt-24 pb-12 px-4 container-hvac">
      <div className="mahogany-surface rounded-3xl p-8 md:p-12 lg:p-16 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold dc-text-heading mb-6">
            Get In Touch
          </h1>
          <p className="text-xl dc-text-body max-w-2xl mx-auto">
            For wellness experiences, website services, billing, refund, or privacy questions, send a message below.
          </p>
        </div>

        <aside aria-label="Contact options" className="mb-8 rounded-2xl border dc-border dc-surface-soft p-5 text-sm leading-relaxed dc-text-body">
          <p>
            Prefer email?{' '}
            <a href="mailto:platformwizard@dailyclarity.org" className="inline-block break-all py-1 font-semibold dc-text-accent underline underline-offset-4">
              platformwizard@dailyclarity.org
            </a>
          </p>
          <p className="mt-2">
            Include your website address or plan if your question concerns an existing account.
            Please leave out passwords, full card details, and private health information.
          </p>
          <p className="mt-2">We use the email you provide to respond to your enquiry.</p>
        </aside>

        {status === 'success' ? (
          <div
            className="text-center py-12 dc-surface-soft rounded-xl border dc-border"
            role="status"
            aria-live="polite"
          >
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-teal-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold dc-text-heading mb-4">Message Received</h2>
            <p className="dc-text-body text-lg mb-8">
              Your message has been saved for review.
            </p>
            <button
              onClick={() => setStatus('idle')}
              className="px-6 py-2 dc-button-secondary rounded-lg transition-all"
            >
              Send Another Message
            </button>
          </div>
        ) : (
          <form 
            onSubmit={handleSubmit}
            className="space-y-8"
            method="post"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label htmlFor="name" className="block dc-text-heading font-semibold mb-2 ml-1">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  maxLength={200}
                  autoComplete="name"
                  className="w-full px-5 py-4 dc-field border dc-border rounded-xl dc-text-heading placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Your full name"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block dc-text-heading font-semibold mb-2 ml-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  maxLength={320}
                  autoComplete="email"
                  className="w-full px-5 py-4 dc-field border dc-border rounded-xl dc-text-heading placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="message" className="block dc-text-heading font-semibold mb-2 ml-1">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                required
                maxLength={10000}
                rows={8}
                className="w-full px-5 py-4 dc-field border dc-border rounded-xl dc-text-heading placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-y"
                placeholder="How can we help you? (Max 10,000 characters)"
              />
              <p className="text-right dc-text-muted text-sm mt-2">
                Max 10,000 characters
              </p>
            </div>

            {status === 'error' && (
              <p
                id="contact-form-status"
                className="rounded-xl border border-red-400/30 bg-red-500/10 px-5 py-4 text-sm text-red-800"
                role="alert"
              >
                {errorMessage}
              </p>
            )}

            <div className="flex justify-center pt-4">
              <button
                type="submit"
                disabled={status === 'submitting'}
                aria-describedby={status === 'error' ? 'contact-form-status' : undefined}
                className="cta-button w-full md:w-auto px-12 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === 'submitting' ? 'Sending…' : 'Send Message'}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
