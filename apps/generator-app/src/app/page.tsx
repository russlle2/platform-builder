import { HeroSection } from '@/components/home/HeroSection';
import { LiveDemoPreview } from '@/components/demo/LiveDemoPreview';
import { PricingSection } from '@/components/pricing/PricingSection';

export default function HomePage() {
  return (
    <main className="relative min-h-screen">
      {/* Aerial HVAC condenser background */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/images/hvac-condenser.jpg)' }}
        />
        <div className="absolute inset-0 bg-gray-950/70" />
        {/* Fan rotation effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 opacity-5">
          <div className="w-full h-full rounded-full border-4 border-gray-400 animate-spin" style={{ animationDuration: '20s' }} />
        </div>
      </div>

      <div className="relative z-10 pt-20 space-y-16 pb-24">
        <HeroSection />
        <LiveDemoPreview />
        <PricingSection />
      </div>
    </main>
  );
}
