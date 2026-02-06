import { PricingSection } from '@/components/pricing/PricingSection';

export default function PricingPage() {
  return (
    <main className="relative min-h-screen">
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/images/hvac-condenser.jpg)' }}
        />
        <div className="absolute inset-0 bg-gray-950/70" />
      </div>

      <div className="relative z-10 pt-24 pb-24">
        <PricingSection />
      </div>
    </main>
  );
}
