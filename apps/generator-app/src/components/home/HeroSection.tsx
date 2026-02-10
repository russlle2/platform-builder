'use client';

import React from 'react';

export function HeroSection() {
  return (
    <section className="relative w-full min-h-[80vh] flex items-center justify-center px-4">
      {/* Full-width mahogany plank container */}
      <div className="relative w-full max-w-6xl mx-auto px-8 py-16 bg-gradient-to-br from-amber-900 via-amber-800 to-yellow-900 rounded-2xl shadow-2xl border border-amber-700/30">
        {/* High-gloss wood grain overlay */}
        <div className="absolute inset-0 opacity-10 rounded-2xl bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(0,0,0,0.1)_2px,rgba(0,0,0,0.1)_4px)]" />
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/5 to-transparent" />

        <div className="relative z-10 text-center space-y-8">
          {/* Headline — bright white, maximum contrast, letter-shaped shadow */}
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
            Skip the learning curve
            <br />
            Build Your HVAC And Plumbing Services Presence Like A Pro
          </h1>

          {/* Supporting text — pure white, 100% opacity */}
          <p className="text-xl md:text-2xl text-white max-w-3xl mx-auto">
            The industrial-premium platform where HVAC and Plumbing professionals can instantly see,
            shape, and understand their website without learning tools, without confusion, and without
            committing until they approve.
          </p>

          {/* Primary CTA */}
          <div className="space-y-3 pt-4">
            <a
              href="/demo"
              className="inline-block px-10 py-4 bg-white text-amber-900 font-bold text-lg rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              Reserve your spot
            </a>
            <p className="text-white text-sm font-medium">
              Limited to 30 active monthly members nationwide
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
