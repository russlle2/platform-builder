import Image from 'next/image'
import Link from 'next/link'

/* ------------------------------------------------------------------ *
 *  Client Template — placeholder constants replaced by                *
 *  scripts/create-client-site.js at generation time.                  *
 ------------------------------------------------------------------ */

const BUSINESS_NAME = 'PLACEHOLDER_BUSINESS_NAME';
const BUSINESS_DESCRIPTION = 'PLACEHOLDER_BUSINESS_DESCRIPTION';
const BUSINESS_PHONE = 'PLACEHOLDER_BUSINESS_PHONE';
const BUSINESS_EMAIL = 'PLACEHOLDER_BUSINESS_EMAIL';
const BUSINESS_ADDRESS = 'PLACEHOLDER_BUSINESS_ADDRESS';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-xl font-bold">{BUSINESS_NAME}</span>
          <div className="flex space-x-6 text-sm">
            <Link href="#services" className="hover:text-amber-400 transition-colors">Services</Link>
            <Link href="#about" className="hover:text-amber-400 transition-colors">About</Link>
            <Link href="#contact" className="hover:text-amber-400 transition-colors">Contact</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="relative min-h-[60vh] flex items-center bg-cover bg-center"
        style={{ backgroundImage: 'url(/images/template-bg-1.jpg)' }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-20">
          <h1 className="text-5xl font-bold text-white mb-4">{BUSINESS_NAME}</h1>
          <p className="text-xl text-white mb-8">{BUSINESS_DESCRIPTION}</p>
          <Link href="#contact" className="inline-block px-8 py-3 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition-colors">
            Get a Free Quote
          </Link>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Our Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {['AC Repair & Installation', 'Heating Services', 'Plumbing Solutions'].map((service) => (
              <div key={service} className="bg-white rounded-xl p-6 shadow-lg">
                <div className="w-12 h-12 bg-amber-100 rounded-lg mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">{service}</h3>
                <p className="text-gray-700">Professional and reliable service you can count on.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="text-4xl font-bold text-center mb-8">Get In Touch</h2>
          <div className="text-center mb-12">
            <p className="text-gray-700 mb-2">{BUSINESS_PHONE} &bull; {BUSINESS_EMAIL}</p>
            <p className="text-gray-700">{BUSINESS_ADDRESS}</p>
          </div>
          
          <form 
            className="space-y-6"
            name="contact"
            method="POST"
            data-netlify="true"
            action="/success"
          >
            <input type="hidden" name="form-name" value="contact" />
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <input
                type="text"
                name="name"
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                name="email"
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Message</label>
              <textarea
                name="message"
                required
                rows={5}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your message"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Send Message
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p>&copy; {new Date().getFullYear()} {BUSINESS_NAME}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}