export default function ClientHomePage() {
  return (
    <main>
      {/* Navigation */}
      <nav className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-xl font-bold">{{BUSINESS_NAME}}</span>
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
          <h1 className="text-5xl font-bold text-white mb-4">{'{{BUSINESS_NAME}}'}</h1>
          <p className="text-xl text-white mb-8">{'{{BUSINESS_DESCRIPTION}}'}</p>
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
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Contact Us</h2>
          <p className="text-gray-600 mb-8">{'{{BUSINESS_PHONE}} • {{BUSINESS_EMAIL}}'}</p>
          <p className="text-gray-600">{'{{BUSINESS_ADDRESS}}'}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p>&copy; {new Date().getFullYear()} {'{{BUSINESS_NAME}}'}. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
