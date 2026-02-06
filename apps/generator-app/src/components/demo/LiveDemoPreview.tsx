'use client';

import React from 'react';

export function LiveDemoPreview() {
  return (
    <section className="max-w-6xl mx-auto px-4">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-3">Live Demo</h2>
        <p className="text-white text-lg">
          Click the preview below to launch the Live Build Wizard
        </p>
      </div>

      {/* Desktop-like zoomed-out preview — entire area is clickable */}
      <a
        href="/editor"
        className="block group cursor-pointer"
      >
        <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50 bg-gray-900 transition-all duration-300 group-hover:shadow-amber-500/20 group-hover:border-amber-500/50 group-hover:scale-[1.02]">
          {/* Browser chrome */}
          <div className="flex items-center space-x-2 px-4 py-2 bg-gray-800/80 border-b border-gray-700/50">
            <div className="flex space-x-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="flex-grow mx-4">
              <div className="bg-gray-700 rounded-md px-3 py-1 text-gray-400 text-xs">
                yoursite.com
              </div>
            </div>
          </div>

          {/* Preview content at reduced scale */}
          <div className="relative" style={{ minHeight: '500px' }}>
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30"
              style={{ backgroundImage: 'url(/images/template-bg-1.jpg)' }}
            />
            <div className="relative z-10 p-8 space-y-6">
              {/* Simulated website preview */}
              <div className="bg-gradient-to-br from-amber-900/80 via-amber-800/80 to-yellow-900/80 rounded-xl p-8 backdrop-blur-sm">
                <h3 className="text-2xl font-bold text-white mb-2">
                  Your Business Name
                </h3>
                <p className="text-white text-sm mb-4">
                  Professional HVAC &amp; Plumbing Services
                </p>
                <div className="flex space-x-3">
                  <div className="px-4 py-2 bg-white/20 rounded-lg text-white text-sm">
                    Services
                  </div>
                  <div className="px-4 py-2 bg-white/20 rounded-lg text-white text-sm">
                    About
                  </div>
                  <div className="px-4 py-2 bg-white/20 rounded-lg text-white text-sm">
                    Contact
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {['AC Repair', 'Heating', 'Plumbing'].map((service) => (
                  <div key={service} className="bg-gray-800/60 rounded-xl p-4 backdrop-blur-sm border border-gray-700/30">
                    <div className="w-10 h-10 bg-amber-600/20 rounded-lg mb-3" />
                    <h4 className="text-white font-medium text-sm">{service}</h4>
                    <p className="text-gray-400 text-xs mt-1">Expert service</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-amber-600/0 group-hover:bg-amber-600/10 transition-all duration-300 flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-6 py-3 bg-white text-amber-900 font-bold rounded-xl shadow-xl text-lg">
                Launch Live Build Wizard →
              </span>
            </div>
          </div>
        </div>
      </a>
    </section>
  );
}
