import type { ReactNode } from 'react'

export function SeoPageShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen pt-24 pb-20 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: [
              'radial-gradient(ellipse 800px 600px at 15% 10%, rgba(34,211,238,0.12), transparent)',
              'radial-gradient(ellipse 600px 800px at 85% 20%, rgba(139,92,246,0.09), transparent)',
              'radial-gradient(ellipse 700px 500px at 50% 80%, rgba(16,185,129,0.06), transparent)',
            ].join(', '),
          }}
        />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.08) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>
      <div className="relative z-10">{children}</div>
    </main>
  )
}
