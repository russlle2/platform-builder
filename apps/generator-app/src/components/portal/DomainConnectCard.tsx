'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { DnsRecord } from '@/lib/netlify'

interface DomainRecordsData {
  records: DnsRecord[]
  isApexDomain: boolean
  hasWww: boolean
  warnings: string[]
}

interface DnsCheckResult {
  checked: boolean
  propagated: boolean
  record: string | null
  expected: string
}

interface DomainConnectCardProps {
  slug: string
  currentDomain?: string
  portalToken?: string
}

function portalHeaders(portalToken?: string, json = false): HeadersInit {
  const headers: Record<string, string> = {}
  if (json) headers['Content-Type'] = 'application/json'
  if (portalToken) headers['x-portal-token'] = portalToken
  return headers
}

const REGISTRAR_GUIDES: { name: string; steps: string }[] = [
  {
    name: 'GoDaddy',
    steps: 'Log in → Manage Domain → DNS → Add Record',
  },
  {
    name: 'Namecheap',
    steps: 'Log in → Domain List → Manage → Advanced DNS → Add New Record',
  },
  {
    name: 'Cloudflare',
    steps:
      'Log in → your domain → DNS → Records → Add Record (DISABLE orange proxy during setup)',
  },
  {
    name: 'Google Domains (now Squarespace)',
    steps: 'Log in → My Domains → Manage → DNS → Custom Records',
  },
  {
    name: 'Other',
    steps:
      'Log in to your registrar, find DNS Management or Name Server settings, add the records above',
  },
]

function ClipboardIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  )
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-cyan-200 border border-white/20 rounded-md hover:bg-white/10 transition-colors"
      aria-label={`Copy ${value}`}
    >
      <ClipboardIcon />
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

export function DomainConnectCard({ slug, currentDomain, portalToken }: DomainConnectCardProps) {
  const [domainInput, setDomainInput] = useState(currentDomain || '')
  const [connectedDomain, setConnectedDomain] = useState<string | null>(currentDomain || null)
  const [recordsData, setRecordsData] = useState<DomainRecordsData | null>(null)
  const [connectStatus, setConnectStatus] = useState<'idle' | 'loading' | 'saving' | 'error'>('idle')
  const [connectMessage, setConnectMessage] = useState<string | null>(null)
  const [checkStatus, setCheckStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [checkResult, setCheckResult] = useState<DnsCheckResult | null>(null)
  const [openGuide, setOpenGuide] = useState<string | null>(null)

  const fetchDomainInfo = useCallback(async () => {
    if (!slug) return
    setConnectStatus('loading')
    try {
      const response = await fetch(
        `/api/sites/domain?slug=${encodeURIComponent(slug)}`,
        { headers: portalHeaders(portalToken), cache: 'no-store' },
      )
      const data = await response.json()
      if (response.ok) {
        if (data.customDomain) {
          setConnectedDomain(data.customDomain)
          setDomainInput(data.customDomain)
        }
        if (data.records) {
          setRecordsData(data.records as DomainRecordsData)
        }
      }
      setConnectStatus('idle')
    } catch {
      setConnectStatus('idle')
    }
  }, [slug, portalToken])

  useEffect(() => {
    fetchDomainInfo()
  }, [fetchDomainInfo])

  useEffect(() => {
    if (currentDomain) {
      setConnectedDomain(currentDomain)
      setDomainInput(currentDomain)
    }
  }, [currentDomain])

  const connectDomain = async () => {
    const trimmed = domainInput.trim()
    if (!trimmed) {
      setConnectStatus('error')
      setConnectMessage('Enter a valid domain name.')
      return
    }
    setConnectStatus('saving')
    setConnectMessage(null)
    try {
      const response = await fetch('/api/sites/domain', {
        method: 'POST',
        headers: portalHeaders(portalToken, true),
        body: JSON.stringify({
          slug,
          customDomain: trimmed,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Domain setup failed')
      }
      setConnectedDomain(data.customDomain)
      if (data.records) {
        setRecordsData(data.records as DomainRecordsData)
      }
      setConnectStatus('idle')
      setConnectMessage('Custom domain saved. Add the DNS records below, then use Check DNS Status to verify it.')
    } catch (error) {
      setConnectStatus('error')
      setConnectMessage(error instanceof Error ? error.message : 'Unable to configure domain.')
    }
  }

  const checkDns = async () => {
    if (!slug) return
    setCheckStatus('loading')
    setCheckResult(null)
    try {
      const response = await fetch(
        `/api/sites/domain?slug=${encodeURIComponent(slug)}&check=true`,
        { headers: portalHeaders(portalToken), cache: 'no-store' },
      )
      const data = (await response.json()) as DnsCheckResult
      if (response.ok && data.checked) {
        setCheckResult(data)
      } else {
        setCheckResult({
          checked: true,
          propagated: false,
          record: null,
          expected: '',
        })
      }
      setCheckStatus('done')
    } catch {
      setCheckStatus('done')
      setCheckResult({
        checked: true,
        propagated: false,
        record: null,
        expected: '',
      })
    }
  }

  const showRecords = connectedDomain && recordsData && recordsData.records.length > 0

  return (
    <div className="mt-4 space-y-6">
      {!connectedDomain && (
        <div className="space-y-3">
          <label htmlFor="custom-domain" className="text-xs uppercase tracking-[0.3em] text-slate-400 block">
            Enter your custom domain
          </label>
          <input
            id="custom-domain"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            placeholder="www.mysite.com"
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder:text-slate-500"
          />
          <button
            type="button"
            onClick={connectDomain}
            disabled={connectStatus === 'saving' || connectStatus === 'loading'}
            className="w-full px-4 py-2 text-sm font-semibold text-white border border-white/20 rounded-lg hover:bg-white/10 disabled:opacity-60"
          >
            {connectStatus === 'saving' ? 'Connecting…' : 'Connect domain'}
          </button>
        </div>
      )}

      {connectedDomain && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/30 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/80 mb-1">Configured domain</p>
          <p className="text-sm font-semibold text-emerald-100 break-all">{connectedDomain}</p>
        </div>
      )}

      {connectMessage && (
        <p
          className={`text-xs ${connectStatus === 'error' ? 'text-red-200' : 'text-emerald-200'}`}
        >
          {connectMessage}
        </p>
      )}

      {showRecords && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-white">
            Add these DNS records at your domain registrar
          </h4>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-3 py-2 font-semibold text-slate-300">Type</th>
                  <th className="px-3 py-2 font-semibold text-slate-300">Name</th>
                  <th className="px-3 py-2 font-semibold text-slate-300">Value</th>
                  <th className="px-3 py-2 font-semibold text-slate-300">TTL</th>
                  <th className="px-3 py-2 font-semibold text-slate-300 sr-only">Copy</th>
                </tr>
              </thead>
              <tbody>
                {recordsData.records.map((record, index) => (
                  <tr
                    key={`${record.type}-${record.name}-${index}`}
                    className="border-b border-white/5 last:border-0"
                  >
                    <td className="px-3 py-3 text-slate-200 font-mono">{record.type}</td>
                    <td className="px-3 py-3 text-slate-200 font-mono">{record.name}</td>
                    <td className="px-3 py-3 text-slate-200 font-mono break-all max-w-[180px]">
                      <div className="flex items-start gap-2 justify-between">
                        <span>{record.value}</span>
                        <CopyButton value={record.value} />
                      </div>
                      <p className="text-slate-400 font-sans mt-1 normal-case">{record.purpose}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-200 font-mono">{record.ttl || '3600'}</td>
                    <td className="px-3 py-3">
                      <CopyButton value={`${record.type}\t${record.name}\t${record.value}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {recordsData.warnings.length > 0 && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 px-4 py-3 space-y-1">
              {recordsData.warnings.map((warning) => (
                <p key={warning} className="text-xs text-amber-100">
                  ⚠️ {warning}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Registrar quick-guides</p>
        <div className="rounded-xl border border-white/10 divide-y divide-white/10">
          {REGISTRAR_GUIDES.map((guide) => (
            <div key={guide.name}>
              <button
                type="button"
                onClick={() => setOpenGuide(openGuide === guide.name ? null : guide.name)}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-sm text-slate-200 hover:bg-white/5"
                aria-expanded={openGuide === guide.name}
              >
                <span className="font-medium">{guide.name}</span>
                <span className="text-slate-400">{openGuide === guide.name ? '−' : '+'}</span>
              </button>
              {openGuide === guide.name && (
                <div className="px-4 pb-3 text-xs text-slate-300">{guide.steps}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {connectedDomain && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={checkDns}
            disabled={checkStatus === 'loading'}
            className="w-full px-4 py-2 text-sm font-semibold text-white border border-cyan-400/40 rounded-lg hover:bg-cyan-500/10 disabled:opacity-60"
          >
            {checkStatus === 'loading' ? 'Checking…' : 'Check DNS Status'}
          </button>

          {checkResult && checkStatus === 'done' && (
            <div
              className={`rounded-xl px-4 py-3 text-sm ${
                checkResult.propagated
                  ? 'bg-emerald-500/10 border border-emerald-400/30 text-emerald-100'
                  : checkResult.record
                    ? 'bg-amber-500/10 border border-amber-400/30 text-amber-100'
                    : 'bg-red-500/10 border border-red-400/30 text-red-100'
              }`}
            >
              {checkResult.propagated ? (
                <p>✅ DNS propagated — your domain is pointing to DailyClarity.</p>
              ) : checkResult.record ? (
                <p>
                  ⏳ Still propagating (can take up to 48 hours). Found:{' '}
                  <code className="font-mono text-xs">{checkResult.record}</code>
                  {checkResult.expected && (
                    <>
                      {' '}
                      — expected:{' '}
                      <code className="font-mono text-xs">{checkResult.expected}</code>
                    </>
                  )}
                </p>
              ) : (
                <p>
                  ❌ Record not found — add the DNS records above at your registrar.
                  {checkResult.expected && (
                    <>
                      {' '}
                      Expected:{' '}
                      <code className="font-mono text-xs">{checkResult.expected}</code>
                    </>
                  )}
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-slate-400">
            DNS changes can take 15 minutes to 48 hours to propagate.
          </p>
        </div>
      )}

      <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Tips</p>
        <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
          <li>
            Lower your TTL to 300 (5 minutes) 24–48 hours before switching to speed up propagation
          </li>
          <li>Don&apos;t change your MX records — this will break your email</li>
          <li>Keep your old hosting active for 72 hours after switching for easy rollback</li>
        </ul>
      </div>

      <Link
        href="/help/custom-domain"
        className="inline-block text-xs font-semibold text-cyan-200 hover:text-cyan-100"
      >
        Learn more about custom domains →
      </Link>
    </div>
  )
}
