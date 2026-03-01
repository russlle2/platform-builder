import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { provisionSite, deploySiteFiles } from '@/lib/netlify'
import {
  readTemplateFile,
  hydrateTemplate,
  getTemplate,
} from '@/lib/templates/niche-registry'
import { buildVariationCSS } from '@/lib/templates/variations'

/**
 * POST /api/test-purchase
 *
 * Simulates a completed purchase without going through Stripe.
 * Runs the same provisioning pipeline as the real webhook:
 *   1. Reserve slug in Supabase
 *   2. Provision Netlify site
 *   3. Build & deploy customized template
 *   4. Store config in portal_sites
 *
 * Only available in development (NODE_ENV !== 'production').
 */
export async function POST(req: Request) {
  // Block in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test purchase is disabled in production.' },
      { status: 403 },
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const body = await req.json()
  const {
    slug,
    template: templateSlug,
    niche,
    planKey = 'basic',
    colorScheme = 'original',
    fontVariation = 'original',
    structureVariation = 'original',
    customerValues = {},
  } = body as {
    slug?: string
    template?: string
    niche?: string
    planKey?: string
    colorScheme?: string
    fontVariation?: string
    structureVariation?: string
    customerValues?: Record<string, string>
  }

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 })
  }

  const normalizedSlug = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

  const log: string[] = []
  let siteUrl = ''
  let siteId = ''

  // ── 1. Reserve slug in Supabase ──────────────────────────────────
  if (supabaseUrl && supabaseServiceKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      })
      await supabase
        .from('site_slugs')
        .upsert({ slug: normalizedSlug, status: 'reserved' }, { onConflict: 'slug' })
      log.push('Slug reserved in Supabase')
    } catch (err) {
      log.push(`Slug reservation failed: ${err}`)
    }
  } else {
    log.push('Supabase not configured — skipping slug reservation')
  }

  // ── 2. Provision Netlify site ────────────────────────────────────
  if (process.env.NETLIFY_ACCESS_TOKEN) {
    try {
      const site = await provisionSite(normalizedSlug)
      siteId = site.siteId
      siteUrl = site.siteUrl
      log.push(`Netlify site provisioned: ${site.siteUrl}`)

      // ── 3. Build & deploy customized template ────────────────────
      if (templateSlug && niche) {
        try {
          const templateData = getTemplate(niche, templateSlug)
          if (templateData) {
            const variationCSS = buildVariationCSS(colorScheme, fontVariation, structureVariation)
            const cssFile = readTemplateFile(niche, templateSlug, 'assets/css/styles.css')
            const jsFile = readTemplateFile(niche, templateSlug, 'assets/js/main.js')

            const deployFiles: Record<string, string> = {}

            for (const page of templateData.pages) {
              const rawHtml = readTemplateFile(niche, templateSlug, page)
              if (!rawHtml) continue
              let html = hydrateTemplate(rawHtml, customerValues)

              // Inject CSS + variation overrides
              const injectedStyles: string[] = []
              if (cssFile) injectedStyles.push(cssFile)
              if (variationCSS) injectedStyles.push(variationCSS)
              if (injectedStyles.length > 0) {
                html = html.replace('</head>', `<style>${injectedStyles.join('\n')}</style></head>`)
              }

              // Inject contact form handler
              const contactScript = `
<script>
(function(){
  var forms = document.querySelectorAll('form');
  forms.forEach(function(form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var data = {};
      new FormData(form).forEach(function(v, k) { data[k] = v; });
      data.slug = '${normalizedSlug}';
      fetch('${process.env.NEXT_PUBLIC_API_URL || ''}/api/forms/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(function() {
        form.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--primary,#22c55e)">Thank you! We\\'ll be in touch soon.</p>';
      }).catch(function() {
        alert('Something went wrong. Please try again.');
      });
    });
  });
})();
</script>`
              html = html.replace('</body>', contactScript + '</body>')
              deployFiles[page] = html
            }

            if (cssFile) deployFiles['assets/css/styles.css'] = cssFile
            if (jsFile) deployFiles['assets/js/main.js'] = jsFile

            const deploy = await deploySiteFiles(siteId, deployFiles)
            log.push(`Template deployed: ${Object.keys(deployFiles).length} files (deploy ${deploy.deployId})`)
          } else {
            log.push(`Template "${templateSlug}" not found in niche "${niche}" — site created but empty`)
          }
        } catch (deployErr) {
          log.push(`Template deploy failed: ${deployErr}`)
        }
      } else {
        log.push('No template/niche specified — site created but empty')
      }

      // Update Supabase records with hosting info
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { persistSession: false },
        })

        await supabase
          .from('site_slugs')
          .update({
            status: 'provisioned',
            netlify_site_id: siteId,
            site_url: siteUrl,
          })
          .eq('slug', normalizedSlug)

        await supabase
          .from('portal_sites')
          .upsert({
            slug: normalizedSlug,
            status: 'active',
            data: {
              niche,
              template: templateSlug,
              colorScheme,
              fontVariation,
              structureVariation,
              customerValues,
              email: customerValues.EMAIL || '',
              netlify_site_id: siteId,
              site_url: siteUrl,
              plan: planKey,
              test_purchase: true,
            },
          }, { onConflict: 'slug' })

        log.push('Supabase records updated (site_slugs + portal_sites)')
      }
    } catch (err) {
      log.push(`Netlify provisioning failed: ${err}`)
    }
  } else {
    log.push('NETLIFY_ACCESS_TOKEN not set — skipping site provisioning')
    // Still build the template locally so we can show what would be deployed
    if (templateSlug && niche) {
      const templateData = getTemplate(niche, templateSlug)
      if (templateData) {
        log.push(`Template "${templateData.name}" found with ${templateData.pages.length} pages — would deploy on purchase`)
      }
    }
  }

  return NextResponse.json({
    success: true,
    slug: normalizedSlug,
    siteUrl: siteUrl || null,
    siteId: siteId || null,
    log,
  })
}
