import { LiveDemoPreview } from '@/components/demo/LiveDemoPreview';

export default function DemoPage() {
  return (
    <main className="relative min-h-screen">
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/images/template-bg-1.jpg)' }}
        />
        <div className="absolute inset-0 bg-slate-50/80" />
      </div>

      <div className="relative z-10 pt-24 pb-24 space-y-16">
        <LiveDemoPreview />
      </div>
    </main>
  );
}
