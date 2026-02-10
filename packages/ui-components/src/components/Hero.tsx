import React from 'react';

export interface HeroProps {
  headline?: string;
  subheadline?: string;
  ctaLabel?: string;
  ctaSubtext?: string;
  onCtaClick?: () => void;
}

export function Hero({
  headline = 'Skip the learning curve\nBuild Your HVAC And Plumbing Services Presence Like A Pro',
  subheadline = 'The industrial-premium platform where HVAC and Plumbing professionals can instantly see, shape, and understand their website.',
  ctaLabel = 'Reserve your spot',
  ctaSubtext = 'Limited to 30 active monthly members nationwide',
  onCtaClick,
}: HeroProps) {
  return (
    <section className="relative w-full min-h-[80vh] flex items-center justify-center">
      {/* Mahogany plank container */}
      <div className="relative w-full max-w-6xl mx-auto px-8 py-16 bg-gradient-to-br from-amber-900 via-amber-800 to-yellow-900 rounded-2xl shadow-2xl border border-amber-700/30">
        {/* Wood grain overlay */}
        <div className="absolute inset-0 opacity-10 rounded-2xl bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(0,0,0,0.1)_2px,rgba(0,0,0,0.1)_4px)]" />

        <div className="relative z-10 text-center space-y-8">
          {/* Headline */}
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight whitespace-pre-line drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
            {headline}
          </h1>

          {/* Supporting text */}
          <p className="text-xl md:text-2xl text-white opacity-100 max-w-3xl mx-auto">
            {subheadline}
          </p>

          {/* Primary CTA */}
          <div className="space-y-3 pt-4">
            <button
              onClick={onCtaClick}
              className="px-10 py-4 bg-white text-amber-900 font-bold text-lg rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              {ctaLabel}
            </button>
            <p className="text-white text-sm font-medium">
              {ctaSubtext}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
