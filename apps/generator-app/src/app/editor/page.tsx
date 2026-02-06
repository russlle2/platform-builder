import { EditorWizard } from '@/components/wizard/EditorWizard';

export default function EditorPage() {
  return (
    <main className="relative min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/images/hvac-condenser.jpg)' }}
        />
        <div className="absolute inset-0 bg-gray-950/80" />
      </div>

      <div className="relative z-10 pt-20 h-screen">
        <EditorWizard />
      </div>
    </main>
  );
}
