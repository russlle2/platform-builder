import { LiveDemoPreview } from '@/components/demo/LiveDemoPreview';

export default function DemoPage() {
  return (
    <main className="relative min-h-screen">
      {/* Aerial HVAC condenser background */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/images/hvac-condenser.jpg)' }}
        />
        <div className="absolute inset-0 bg-gray-950/70" />
      </div>

      <div className="relative z-10 pt-24 pb-24 space-y-16">
        <LiveDemoPreview />
      </div>
    </main>
  );
}
