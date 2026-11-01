import type { SiteUsageStatus } from '@/lib/usage-allowances'

export function UsageAllowanceCard({ usage }: { usage: SiteUsageStatus | null }) {
  if (!usage) return <p className="mt-4 text-sm text-slate-400">Usage totals are temporarily unavailable. Allowances are checked before publishing, sending contact notifications, or storing an image.</p>
  const date = new Date(usage.resetAt).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric' })
  const nearLimit = usage.publish.used >= usage.publish.limit * 0.8 || usage.contact.used >= usage.contact.limit * 0.8
    || usage.storage.bytes >= usage.storage.byteLimit * 0.8 || usage.storage.objects >= usage.storage.objectLimit * 0.8
  return <div className="mt-5 rounded-xl border border-slate-700 p-4 text-sm">
    <h3 className="font-semibold text-white">{usage.entitlement.tier === 'trial' ? 'Trial allowances' : 'Included allowances'}</h3>
    <dl className="mt-3 space-y-2 text-slate-300">
      <div className="flex justify-between gap-3"><dt>Publish attempts this month</dt><dd>{usage.publish.used} / {usage.publish.limit}</dd></div>
      <div className="flex justify-between gap-3"><dt>Contact submissions this month</dt><dd>{usage.contact.used} / {usage.contact.limit}</dd></div>
      <div className="flex justify-between gap-3"><dt>Stored images</dt><dd>{usage.storage.objects} / {usage.storage.objectLimit}</dd></div>
      <div className="flex justify-between gap-3"><dt>Image storage</dt><dd>{(usage.storage.bytes / 1048576).toFixed(1)} / {usage.storage.byteLimit / 1048576} MiB</dd></div>
    </dl>
    <p className="mt-3 text-xs leading-relaxed text-slate-400">Publishing and contact allowances reset {date} at 00:00 UTC. Stored images remain counted until removed. Reaching a limit pauses that action; it never creates an extra charge.</p>
    {nearLimit && <p className="mt-3 text-amber-200">You are approaching an included allowance. Review your usage or contact support before you need more capacity.</p>}
    {!usage.entitlement.allowed && <p className="mt-3 text-amber-200">Included services need subscription verification. Your account and billing settings remain accessible.</p>}
  </div>
}
