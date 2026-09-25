import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url))

function collectTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return collectTsxFiles(path)
    return entry.isFile() && entry.name.endsWith('.tsx') ? [path] : []
  })
}

const publicSourcePaths = [
  ...collectTsxFiles(join(sourceRoot, 'app')),
  ...collectTsxFiles(join(sourceRoot, 'components')),
  join(sourceRoot, 'lib', 'plans.ts'),
  join(sourceRoot, 'lib', 'seo.ts'),
  join(sourceRoot, 'app', 'api', 'chat', 'route.ts'),
]

const publicSources = publicSourcePaths.map((path) => ({
  path: relative(sourceRoot, path),
  content: readFileSync(path, 'utf8'),
}))

const readSource = (path: string) => readFileSync(join(sourceRoot, path), 'utf8')
const proofSource = readSource('app/proof/page.tsx')
const pricingSource = readSource('app/pricing/PricingClient.tsx')
const chatSource = readSource('app/api/chat/route.ts')

describe('public trust copy', () => {
  it('does not reintroduce the unverified launch claims or placeholder customer proof', () => {
    const retiredClaims = [
      '48-hour average launch',
      '48 hours or less',
      '48 hrs',
      'Hosted 24/7',
      'Platform uptime',
      '+32%',
      '+28%',
      '-21%',
      '30-member',
      'Join the elite',
      'Booked five new discovery calls',
      'Evergreen Wellness Co.',
      'Stillwater Holistic',
      'Harmony Sound Bath',
      'Lumen Aromatherapy',
      'Lumen Wellness Studio',
      '/images/proof-',
      '500+ unique',
      'Member cap:',
      'every plan includes a 7-day trial',
      'online payments',
      'online-payment ready',
      'gpt-3.5-turbo',
      '/v1/chat/completions',
    ]

    for (const { path, content } of publicSources) {
      for (const claim of retiredClaims) {
        expect(content, `${path} contains retired claim: ${claim}`).not.toContain(claim)
      }
    }
  })

  it('does not present estimates, catalog counts, scarcity, or inferred setup states as facts', () => {
    const retiredPatterns = [
      /Avg Launch[\s\S]{0,160}48 hrs/i,
      /\bETA\b[\s\S]{0,160}48 hrs/i,
      /500\+\s+(?:validated|editable|unique|templates)/i,
      /\{(?:templateCount|totalCount)\}\+/,
      /\$\{[^}]*Count\}\+/,
      /Every template (?:is|has)/i,
      /built into every template/i,
      /Switch templates and styles/i,
      /Template & style switching/i,
      /Limited to \d+ active monthly members/i,
      /Reserve Your Spot/i,
      /launch slots/i,
      /15% launch discount/i,
      /Claim 15% Off/i,
      /Custom domain connected', done: hasCustomDomain/,
      /Contact form tested', done: provisioningStatus === 'active'/,
      /status: siteActive \? 'Connected'/,
      /Awaiting onboarding completion/i,
      /Your custom domain is connected\./i,
      /(?:fills|filled|populate(?:d)?) every page automatically/i,
    ]

    for (const { path, content } of publicSources) {
      for (const pattern of retiredPatterns) {
        expect(content, `${path} matches retired trust-copy pattern: ${pattern}`).not.toMatch(pattern)
      }
    }
  })

  it('sets an explicit early-access evidence standard and offers product-led evaluation', () => {
    expect(proofSource).toContain('Transparent early access')
    expect(proofSource).toContain('An editable business preview')
    expect(proofSource).toContain('Permission first')
    expect(pricingSource).toContain('See the product first')
    expect(pricingSource).toContain('What we can substantiate today')
    expect(chatSource).toContain('/v1/responses')
    expect(chatSource).toContain('gpt-5.6-luna')
  })
})
