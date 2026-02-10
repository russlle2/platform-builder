<<<<<<< HEAD
import Image from 'next/image'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">My Website</h1>
          <div className="space-x-6">
            <Link href="#about" className="hover:underline">About</Link>
            <Link href="#services" className="hover:underline">Services</Link>
            <Link href="#contact" className="hover:underline">Contact</Link>
          </div>
        </nav>
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-5xl font-bold mb-6">
            Welcome to Your New Website
          </h2>
          <p className="text-xl mb-8 opacity-90">
            This is a template site created with the platform-builder generator
          </p>
          <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
            Get Started
          </button>
        </div>
      </header>

      {/* About Section */}
      <section id="about" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">About Us</h2>
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-lg text-gray-700 mb-6">
              This is a placeholder section where you can add information about your business,
              project, or personal brand. Customize this content to tell your story.
            </p>
            <div className="relative h-64 rounded-lg overflow-hidden">
              <Image
                src="https://via.placeholder.com/800x400/e2e8f0/475569?text=About+Image"
                alt="About"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">Our Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl">🚀</span>
                </div>
                <h3 className="text-xl font-semibold mb-4">Service {i}</h3>
                <p className="text-gray-600">
                  Description of service {i}. Add your own content here to describe what you offer.
                </p>
=======
/* ------------------------------------------------------------------ *
 *  Client Template — placeholder constants replaced by                *
 *  scripts/create-client-site.js at generation time.                  *
 * ------------------------------------------------------------------ */

const BUSINESS_NAME = 'PLACEHOLDER_BUSINESS_NAME';
const BUSINESS_DESCRIPTION = 'PLACEHOLDER_BUSINESS_DESCRIPTION';
const BUSINESS_PHONE = 'PLACEHOLDER_BUSINESS_PHONE';
const BUSINESS_EMAIL = 'PLACEHOLDER_BUSINESS_EMAIL';
const BUSINESS_ADDRESS = 'PLACEHOLDER_BUSINESS_ADDRESS';

export default function ClientHomePage() {
  return (
    <main>
      {/* Navigation */}
      <nav className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-xl font-bold">{BUSINESS_NAME}</span>
          <div className="flex space-x-6 text-sm">
            <a href="#services" className="hover:text-amber-400 transition-colors">Services</a>
            <a href="#about" className="hover:text-amber-400 transition-colors">About</a>
            <a href="#contact" className="hover:text-amber-400 transition-colors">Contact</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="relative min-h-[60vh] flex items-center bg-cover bg-center"
        style={{ backgroundImage: 'url(/images/template-bg-1.jpg)' }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-20">
          <h1 className="text-5xl font-bold text-white mb-4">{BUSINESS_NAME}</h1>
          <p className="text-xl text-white mb-8">{BUSINESS_DESCRIPTION}</p>
          <a href="#contact" className="inline-block px-8 py-3 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition-colors">
            Get a Free Quote
          </a>
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
                <p className="text-gray-600">Professional and reliable service you can count on.</p>
>>>>>>> origin/main
              </div>
            ))}
          </div>
        </div>
      </section>

<<<<<<< HEAD
      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="text-4xl font-bold text-center mb-12">Get In Touch</h2>
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
=======
      {/* Contact */}
      <section id="contact" className="py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Contact Us</h2>
          <p className="text-gray-600 mb-8">{BUSINESS_PHONE} &bull; {BUSINESS_EMAIL}</p>
          <p className="text-gray-600">{BUSINESS_ADDRESS}</p>
>>>>>>> origin/main
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
<<<<<<< HEAD
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2024 My Website. Created with platform-builder.</p>
        </div>
      </footer>
    </div>
  )
=======
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p>&copy; {new Date().getFullYear()} {BUSINESS_NAME}. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
>>>>>>> origin/main
}
