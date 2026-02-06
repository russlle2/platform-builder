export default function BuildsPage() {
  return (
    <main className="relative min-h-screen">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/images/hvac-condenser.jpg)' }} />
        <div className="absolute inset-0 bg-gray-950/70" />
      </div>
      <div className="relative z-10 pt-24 pb-24 max-w-6xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-white mb-8">Builds</h1>
        <p className="text-white text-lg">Monitor and manage your active builds and deployments.</p>
      </div>
    </main>
  );
}
