# Platform Builder

Industrial-premium platform for HVAC and Plumbing professionals to instantly see, shape, and understand their website.

## Monorepo Structure

```
├── apps/
│   ├── generator-app/      # Main dashboard, editor, live preview, pricing, wizard (Next.js)
│   └── client-template/    # Base template for generating client sites (Next.js)
├── packages/
│   ├── ui-components/      # Shared React/Tailwind components
│   ├── utils/              # Shared utilities (SEO, routing, formatting)
│   └── image-optimizer/    # Sharp-based image optimization pipeline
├── infrastructure/
│   ├── netlify/            # Netlify configs (dev, staging, production)
│   └── github/workflows/  # CI/CD workflows
├── scripts/                # Automation scripts
└── package.json            # Root workspace config
```

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **UI:** React 19, Tailwind CSS 4
- **Language:** TypeScript 5
- **Image Processing:** Sharp
- **CI/CD:** GitHub Actions + Netlify
- **Monorepo:** npm workspaces

## Getting Started

```bash
# Install all dependencies
npm install

# Start the generator app in development
npm run dev

# Build all workspaces
npm run build

# Run tests
npm run test

# Run linting
npm run lint
```

## Apps

### Generator App (`apps/generator-app`)

The main platform with:
- **Home** — Hero section with HVAC condenser background, mahogany surface design
- **Live Demo** — Desktop-like preview that opens the Live Build Wizard
- **Editor** — Step-based wizard (left panel: questions, right panel: live preview)
- **Pricing** — Four tiers: Entrepreneur ($99/mo), Custom Build ($499), Executive ($399/mo), CEO ($999/mo)
- **Proof** — Case studies and testimonials
- **Archive** — Saved configurations
- **Builds** — Deployment monitoring

### Client Template (`apps/client-template`)

Base template for generating client sites with placeholder tokens (`{{BUSINESS_NAME}}`, etc.).

## Packages

### `@platform-builder/ui-components`

Shared components: Button, Card, Navigation, Hero, PricingCard, ImageUploader, Toggle, WizardPanel, PreviewFrame, TemplateSelector.

### `@platform-builder/utils`

Utilities for SEO (meta tags, sitemaps, robots.txt), formatting (phone, currency, dates, slugify), and routing.

### `@platform-builder/image-optimizer`

Sharp-based pipeline for compressing, converting, and resizing images.

## Scripts

```bash
# Create a new client site from template
node scripts/create-client-site.js --name "Business Name" --type hvac

# Sync content and regenerate sitemaps
node scripts/sync-content.js

# Optimize images
node scripts/optimize-images.js
```

## CI/CD Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `deploy.yml` | Push to `main` | Deploy to production |
| `preview.yml` | PRs and branches | Deploy preview sites |
| `tests.yml` | PRs and pushes | Lint, typecheck, unit & integration tests |
| `lighthouse.yml` | Deployments | Performance audit (fails if < 90) |
| `optimize-images.yml` | Image changes | Compress and convert images |
| `scheduled-builds.yml` | Nightly (2 AM UTC) | Rebuild sites, regenerate sitemaps |

## Multi-Environment Deployments

| Environment | URL | Config |
|-------------|-----|--------|
| Development | `dev.yourdomain.com` | `infrastructure/netlify/dev.toml` |
| Staging | `staging.yourdomain.com` | `infrastructure/netlify/staging.toml` |
| Production | `yourdomain.com` | `infrastructure/netlify/production.toml` |

## Image Handling

- **Upload:** Drag-and-drop + file picker with real-time preview
- **Optimize Toggle:** Per-field toggle to run Sharp optimization pipeline
- **Categories:** Foreground, background, template, logo, gallery
- **Placeholder paths:** `/images/hvac-condenser.jpg`, `/images/mahogany.jpg`, `/images/template-bg-*.jpg`
- **User Library:** Account-based image management (favorites, categories, reuse)