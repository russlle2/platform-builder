'use client'

import Image from 'next/image'

interface LivePreviewProps {
  data: any
}

export function LivePreview({ data }: LivePreviewProps) {
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-2xl h-full min-h-[600px]">
      {/* Mock Browser Chrome */}
      <div className="bg-gray-200 px-4 py-2 flex items-center gap-2 border-b">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div className="flex-1 bg-white rounded px-3 py-1 text-sm text-gray-600">
          {data.businessName ? `${data.businessName.toLowerCase().replace(/\s+/g, '')}.com` : 'yourbusiness.com'}
        </div>
      </div>

      {/* Preview Content */}
      <div 
        className="h-full overflow-y-auto"
        style={{ 
          backgroundColor: '#ffffff',
          backgroundImage: `url(${data.backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Hero Section */}
        <div className="relative min-h-[400px] flex items-center justify-center p-8" style={{
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
        }}>
          <div className="text-center space-y-6 max-w-3xl">
            {data.logo && (
              <Image
                src={data.logo}
                alt="Logo"
                width={160}
                height={64}
                className="h-16 w-auto mx-auto"
                unoptimized
              />
            )}
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              {data.businessName || 'Your Business Name'}
            </h1>
            {data.tagline && (
              <p className="text-xl text-gray-200">
                {data.tagline}
              </p>
            )}
            {data.description && (
              <p className="text-gray-300 max-w-2xl mx-auto">
                {data.description}
              </p>
            )}
            <button 
              className="px-8 py-3 font-bold rounded-lg text-white"
              style={{ backgroundColor: data.accentColor }}
            >
              Get Started
            </button>
          </div>
        </div>

        {/* Services Section */}
        {data.services && data.services.length > 0 && (
          <div className="bg-white py-16 px-8">
            <div className="max-w-6xl mx-auto">
              <h2 
                className="text-3xl font-bold text-center mb-12"
                style={{ color: data.accentColor }}
              >
                Our Services
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {data.services.slice(0, 6).map((service: string, index: number) => (
                  <div 
                    key={index} 
                    className="p-6 border-2 rounded-lg text-center hover:shadow-lg transition-shadow"
                    style={{ borderColor: data.accentColor + '30' }}
                  >
                    <div className="text-3xl mb-2">✓</div>
                    <h3 className="font-semibold text-gray-800">{service}</h3>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Contact Section */}
        <div 
          className="py-16 px-8 text-white" 
          style={{ backgroundColor: data.accentColor }}
        >
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h2 className="text-3xl font-bold">Get In Touch</h2>
            {data.phoneNumber && (
              <p className="text-2xl font-semibold">
                📞 {data.phoneNumber}
              </p>
            )}
            {data.email && (
              <p className="text-lg">
                ✉️ {data.email}
              </p>
            )}
            {data.address && (
              <p className="text-lg">
                📍 {data.address}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
