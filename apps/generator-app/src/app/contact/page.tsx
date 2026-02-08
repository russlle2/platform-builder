'use client'

import { useState } from 'react'

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // For Netlify forms, we can rely on standard submission or use fetch
    // Using fetch allows us to stay on the page and show a custom success message without redirect
    const myForm = e.currentTarget
    const formData = new FormData(myForm)

    fetch('/', {
      method: 'POST',
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(formData as any).toString(),
    })
      .then(() => setSubmitted(true))
      .catch((error) => alert(error))
  }

  return (
    <main className="min-h-screen pt-24 pb-12 px-4 container-hvac">
      <div className="mahogany-surface rounded-3xl p-8 md:p-12 lg:p-16 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-bright-white mb-6">
            Get In Touch
          </h1>
          <p className="text-xl text-pure-white max-w-2xl mx-auto">
            Have questions about building your presence? We're here to help you skip the learning curve.
          </p>
        </div>

        {submitted ? (
          <div className="text-center py-12 bg-green-900/40 rounded-xl border border-green-500/30">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Message Received</h2>
            <p className="text-gray-300 text-lg mb-8">
              Thanks for reaching out! We'll be in touch shortly.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
            >
              Send Another Message
            </button>
          </div>
        ) : (
          <form 
            onSubmit={handleSubmit}
            className="space-y-8"
            name="contact-platform"
            method="POST"
            data-netlify="true"
          >
            <input type="hidden" name="form-name" value="contact-platform" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label htmlFor="name" className="block text-white font-semibold mb-2 ml-1">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="w-full px-5 py-4 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Your full name"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-white font-semibold mb-2 ml-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="w-full px-5 py-4 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="message" className="block text-white font-semibold mb-2 ml-1">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                required
                maxLength={10000}
                rows={8}
                className="w-full px-5 py-4 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-y"
                placeholder="How can we help you? (Max 10,000 characters)"
              />
              <p className="text-right text-gray-400 text-sm mt-2">
                Max 10,000 characters
              </p>
            </div>

            <div className="flex justify-center pt-4">
              <button
                type="submit"
                className="cta-button w-full md:w-auto px-12"
              >
                Send Message
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
