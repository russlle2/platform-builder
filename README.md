# Platform Builder - Industrial-Premium HVAC & Plumbing Platform

An advanced, industrial-premium platform where HVAC and Plumbing professionals can instantly see, shape, and understand their website without learning tools, without confusion, and without committing until they approve.

## 🏗️ Monorepo Architecture

```
platform-builder/
├── apps/
│   ├── generator-app/          # Main dashboard, editor, wizard, pricing
│   │   ├── src/
│   │   │   ├── app/           # Next.js App Router pages
│   │   │   │   ├── page.tsx           # Home with hero section
│   │   │   │   ├── wizard/            # Live Build Wizard
│   │   │   │   ├── pricing/           # Transparent pricing tiers
│   │   │   │   ├── live-demo/         # Interactive demo
│   │   │   │   ├── proof/             # Social proof gallery
│   │   │   │   ├── archive/           # Template archive
│   │   │   │   ├── builds/            # User builds dashboard
│   │   │   │   └── api/upload/        # Image upload endpoint
│   │   │   ├── components/    # React components
│   │   │   │   ├── Navigation.tsx
│   │   │   │   ├── ImageUploadWithOptimize.tsx
│   │   │   │   ├── LivePreview.tsx
│   │   │   │   └── TemplateSelector.tsx
│   │   │   └── store/         # Zustand state management
│   │   └── public/
│   │       ├── images/        # Placeholder image paths
│   │       └── uploads/       # User-uploaded images
│   │
│   └── client-template/        # Base template for generated sites
│       ├── src/
│       └── public/
│
├── packages/
│   ├── ui-components/         # Shared React/Tailwind components
│   │   └── src/components/
│   ├── utils/                 # Shared utilities (SEO, routing)
│   │   └── src/
│   ├── image-optimizer/       # Sharp-based optimization pipeline
│   │   └── src/index.ts
│   └── scripts/               # Build and deployment scripts
│       └── src/
│
├── infrastructure/
│   ├── netlify/               # Multi-environment Netlify configs
│   │   ├── dev.toml
│   │   ├── staging.toml
│   │   ├── production.toml
│   │   └── netlify.toml
│   ├── github/workflows/      # CI/CD GitHub Actions
│   │   ├── deploy.yml             # Production deployment
│   │   ├── preview.yml            # PR preview deployments
│   │   ├── tests.yml              # Automated testing
│   │   ├── lighthouse.yml         # Performance audits
│   │   ├── optimize-images.yml    # Image optimization
│   │   └── scheduled-builds.yml   # Nightly rebuilds
│   └── scripts/               # Automation scripts
│       ├── create-client-site.js
│       ├── sync-content.js
│       └── optimize-images.js
│
├── package.json               # Root workspace config
└── .lighthouserc.json        # Lighthouse CI config
```

## 🎨 Design System

### Global Environment
- **Background**: Aerial top-down HVAC condenser (90° vertical angle)
- **Fan Motion**: Smooth Z-axis rotation illusion
- **Lighting**: Industrial daylight with neutral-cool metal tones
- **Persistence**: Background appears across all pages

### Surface System
- **Primary Surface**: Lacquered mahogany wood
- **Finish**: High-gloss with real wood grain texture
- **Usage**: Text blocks, cards, editor panels, previews, pricing

### Color Palette
```css
--hvac-industrial-blue: #2563eb
--hvac-metal-gray: #64748b
--mahogany-primary: #3e1f1f
--mahogany-gloss: #5a2e2e
--text-bright-white: #ffffff (high contrast)
```

### Navigation
- Persistent top navigation with high contrast
- Items: Home, Live Demo, Editor, Pricing, Proof, Archive, Builds
- Immediate hover feedback
- Clear, direct navigation

## 🚀 Features

### Homepage
- **Hero Section**: Mahogany plank with bold headline
- **Headline**: "Skip the learning curve - Build Your HVAC And Plumbing Services Presence Like A Pro"
- **Primary CTA**: "Reserve your spot"
- **Scarcity Message**: "Limited to 30 active monthly members nationwide"

### Live Build Wizard
- **Split Panel Layout**: Questions on left, live preview on right
- **Step-Based Navigation**: No scrolling required
- **Real-Time Updates**: Every change updates preview instantly
- **Features**:
  - Template switching with content preservation
  - Accent color picker
  - Font selection (heading/body)
  - Image uploads (logo, hero, background, gallery)
  - Auto-fill toggle for suggested content
  - Service selection

### Image Handling System
1. **User Uploads**: Drag-and-drop, file picker, real-time preview
2. **Optimize Toggle**: Optional Sharp optimization
3. **User Library**: Account-based image storage (for logged-in users)
4. **API Endpoints**:
   - `POST /api/upload` - Upload images
   - `GET /api/upload` - List user images
   - `DELETE /api/upload?filename=xxx` - Delete images

### Pricing Tiers
- **Custom Build**: $499 (50/50 split, refund before approval)
- **Entrepreneur**: $99/month
- **Executive**: $399/month (Most Popular)
- **CEO**: $999/month (Premium)

### Template System
- 9+ HVAC-relevant templates
- 1080p media
- Template switching preserves user data
- Only layout/background changes

## 📦 Installation

```bash
# Install all workspace dependencies
pnpm install

# Install dependencies for specific workspace
pnpm install --filter ./apps/generator-app...
```

## 🛠️ Development

```bash
# Start generator app
pnpm run generator:dev
# → http://localhost:3000

# Start client template
pnpm run client:dev
# → http://localhost:3001

# Build all workspaces
pnpm run build

# Run tests
pnpm run test

# Lint all workspaces
pnpm run lint
```

## 🎨 Available Scripts

### Root Level
```bash
pnpm run dev                  # Start generator-app
pnpm run build                # Build all workspaces
pnpm run lint                 # Lint all workspaces
pnpm run test                 # Test all workspaces
pnpm run clean                # Clean build artifacts

# Client site management
pnpm run create-client <name>  # Create new client site
pnpm run sync-content          # Sync content to all sites
pnpm run optimize-images       # Optimize all images

# Deployment
pnpm run deploy:dev            # Deploy to dev
pnpm run deploy:staging        # Deploy to staging
pnpm run deploy:production     # Deploy to production
```

### Generator App
```bash
pnpm run generator:dev         # Development mode
pnpm run generator:build       # Build for production
```

### Client Template
```bash
pnpm run client:dev            # Development mode
pnpm run client:build          # Build for production
```

## 🌐 CI/CD Pipeline

### GitHub Actions Workflows

1. **deploy.yml** - Production Deployment
   - Triggers on push to `main`
   - Builds and deploys to Netlify production
   - Deploys both generator-app and client-template

2. **preview.yml** - Preview Deployments
   - Triggers on pull requests and branches
   - Deploys preview sites to Netlify
   - Comments preview URLs on PRs

3. **tests.yml** - Automated Testing
   - Runs linting, type checking, unit tests
   - Tests on Node.js 18 and 20
   - Security scanning with pnpm audit
   - Blocks deployment on failure

4. **lighthouse.yml** - Performance Audits
   - Runs Lighthouse CI on every deployment
   - Enforces performance > 90%
   - Comments scores on PRs
   - Fails build if thresholds not met

5. **optimize-images.yml** - Image Optimization
   - Triggers on image file changes
   - Automatically optimizes with Sharp
   - Commits optimized images back to repo

6. **scheduled-builds.yml** - Nightly Rebuilds
   - Runs daily at midnight UTC
   - Rebuilds all sites
   - Regenerates sitemaps
   - Syncs CMS content
   - Performs health checks

### Multi-Environment Setup

Configure these secrets in GitHub:
- `NETLIFY_AUTH_TOKEN` - Your Netlify auth token
- `NETLIFY_SITE_ID` - Generator app site ID
- `NETLIFY_SITE_ID_CLIENT` - Client template site ID

### Netlify Environments

- **Development**: `dev.yourdomain.com` (dev.toml)
- **Staging**: `staging.yourdomain.com` (staging.toml)
- **Production**: `yourdomain.com` (production.toml)

Each environment has:
- Separate environment variables
- Separate build settings
- Separate deployment triggers

## 📸 Image Optimization

Built-in Sharp-based optimization pipeline:

```bash
# Optimize specific directory
node infrastructure/scripts/optimize-images.js apps/generator-app/public

# Optimize all images
npm run optimize-images
```

Features:
- Automatic compression (80% quality)
- WebP and AVIF conversion
- Responsive variants (320w, 640w, 768w, 1024w, 1280w, 1920w)
- Preserves original files
- Comprehensive optimization reports

## 🧪 Testing

```bash
# Run all tests
npm run test

# Lint all code
npm run lint

# Type checking
npx tsc --noEmit
```

## 🚢 Deployment

### Manual Deployment
```bash
# Build production
npm run build

# Deploy to Netlify
npm run deploy:production
```

### Automatic Deployment
- Push to `main` → Auto-deploy to production
- Create PR → Auto-deploy preview
- Merge PR → Auto-deploy to production

## 📋 Environment Variables

Create `.env.local` in `apps/generator-app/`:

```env
NEXT_PUBLIC_SITE_NAME="HVAC Pro"
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NETLIFY_AUTH_TOKEN=your_token_here
NETLIFY_SITE_ID=your_site_id_here
```

## 🎯 Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Image Processing**: Sharp
- **Package Manager**: npm workspaces
- **CI/CD**: GitHub Actions
- **Deployment**: Netlify
- **Performance**: Lighthouse CI

## 📖 Documentation

- [Image Assets Guide](apps/generator-app/public/images/README.md)
- [Upload System Guide](apps/generator-app/public/uploads/README.md)
- [Image Optimizer API](packages/image-optimizer/src/index.ts)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run test`
5. Submit a pull request

## 📄 License

Private - All Rights Reserved

---

**Built for Elite HVAC & Plumbing Professionals**

Skip the learning curve. Build like a pro.
3. Use in apps: `import { YourComponent } from '@platform-builder/ui'`

### To the Generator App

1. Create component in `apps/generator/src/components/`
2. Import and use in pages or other components

## 📚 Placeholder Images

The project uses placeholder images from:
- `via.placeholder.com` - For template previews and component defaults
- Custom placeholders can be configured in `next.config.js`

## 🤝 Contributing

1. Create a new branch for your feature
2. Make your changes
3. Run linting and builds: `npm run lint && npm run build`
4. Submit a pull request

## 📄 License

MIT

## 🎯 Future Enhancements

- [ ] Add testing infrastructure (Jest, React Testing Library)
- [ ] Implement real cloud storage for image uploads (S3, Cloudinary)
- [ ] Add database integration for saving projects
- [ ] Implement user authentication
- [ ] Add more component types to the library
- [ ] Create more client site templates
- [ ] Add export functionality for generated sites
- [ ] Implement version control for projects
