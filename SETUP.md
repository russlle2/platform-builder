# Platform Builder - Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
# Install all workspace dependencies
npm install
```

This will install dependencies for:
- Root workspace
- apps/generator-app
- apps/client-template
- packages/ui-components
- packages/utils
- packages/image-optimizer
- packages/scripts

### 2. Environment Setup

Create `.env.local` in `apps/generator-app/`:

```env
# Site Configuration
NEXT_PUBLIC_SITE_NAME="HVAC Pro Platform"
NEXT_PUBLIC_API_URL=http://localhost:3000

# Netlify (for deployment)
NETLIFY_AUTH_TOKEN=your_netlify_token_here
NETLIFY_SITE_ID=your_site_id_here
NETLIFY_SITE_ID_CLIENT=your_client_site_id_here

# Optional: Image Upload Configuration
MAX_UPLOAD_SIZE=10485760  # 10MB in bytes
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/gif,image/webp
```

### 3. Add Placeholder Images

The platform uses placeholder image paths. You need to upload actual images to:

```
apps/generator-app/public/images/
```

Required images (see README in that directory):
- `hvac-condenser.jpg` - Main background
- `mahogany.jpg` - Wood texture
- Template thumbnails
- Proof section images

### 4. Start Development Server

```bash
# Start generator app
npm run generator:dev

# Visit: http://localhost:3000
```

### 5. Test Image Upload

1. Navigate to `/wizard`
2. Go to the "Media" step
3. Upload a test image
4. Verify it appears in `public/uploads/`

## Development Workflow

### Daily Development

```bash
# Start the dev server
npm run generator:dev

# In another terminal, run tests
npm run test

# Lint your code
npm run lint
```

### Building

```bash
# Build all workspaces
npm run build

# Build specific workspace
npm run generator:build
npm run client:build
```

### Creating Client Sites

```bash
# Create a new client site from template
npm run create-client "Elite HVAC Phoenix"

# This creates: generated-sites/elite-hvac-phoenix/
```

### Image Management

```bash
# Optimize all images in a directory
npm run optimize-images apps/generator-app/public/images

# Or optimize specific directory
node infrastructure/scripts/optimize-images.js <path>
```

## GitHub Actions Setup

### 1. Set Repository Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
- `NETLIFY_AUTH_TOKEN` - Get from Netlify → User settings → Applications
- `NETLIFY_SITE_ID` - Get from Netlify site → Site settings → General
- `NETLIFY_SITE_ID_CLIENT` - For client template site

### 2. Enable GitHub Actions

GitHub Actions should be enabled by default. Workflows will:
- Run tests on every push/PR
- Deploy previews for PRs
- Deploy to production on merge to main
- Run Lighthouse audits
- Optimize images automatically
- Rebuild nightly

### 3. Verify Workflows

Push a test commit and check:
- GitHub → Actions tab
- Verify workflows are running
- Check deploy preview URLs in PR comments

## Netlify Setup

### 1. Create Netlify Sites

Create 3 sites on Netlify:
1. **Development**: For dev environment
2. **Staging**: For staging environment
3. **Production**: For live site

### 2. Configure Build Settings

For each site:

**Build command**: (Leave empty - handled by GitHub Actions)
**Publish directory**: `apps/generator-app/.next`
**Functions directory**: `apps/generator-app/netlify/functions`

### 3. Environment Variables

#### Development Site
```
NODE_ENV=development
NEXT_PUBLIC_API_URL=https://dev.yourdomain.com
```

#### Staging Site
```
NODE_ENV=staging
NEXT_PUBLIC_API_URL=https://staging.yourdomain.com
```

#### Production Site
```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://yourdomain.com
```

### 4. Custom Domains

Configure custom domains:
- Dev: `dev.yourdomain.com`
- Staging: `staging.yourdomain.com`
- Production: `yourdomain.com`

## Lighthouse CI Setup

### 1. Create Lighthouse CI Project

Visit: https://github.com/apps/lighthouse-ci

Install the GitHub app and grant access to your repository.

### 2. Get LHCI Token

After installation, you'll receive a `LHCI_GITHUB_APP_TOKEN`.

Add this to GitHub repository secrets:
```
LHCI_GITHUB_APP_TOKEN=your_token_here
```

### 3. Verify Configuration

The `.lighthouserc.json` file is already configured with:
- Performance threshold: 90%
- Accessibility threshold: 90%
- Best practices threshold: 90%
- SEO threshold: 90%

## Testing

### Run All Tests

```bash
npm run test
```

### Run Specific Test Suite

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests (if configured)
npm run test:e2e
```

### Linting

```bash
# Lint all workspaces
npm run lint

# Fix lint issues
npm run lint:fix
```

### Type Checking

```bash
# Check TypeScript types
npx tsc --noEmit
```

## Deployment

### Manual Deployment

```bash
# Deploy to development
npm run deploy:dev

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production
```

### Automatic Deployment

Deployment happens automatically via GitHub Actions:

1. **Push to feature branch** → Creates preview deployment
2. **Create PR** → Comments preview URL on PR
3. **Merge to main** → Deploys to production

## Troubleshooting

### Build Fails

```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

### Image Upload Not Working

1. Check `public/uploads/` directory exists
2. Verify file permissions
3. Check `.env.local` for correct settings
4. Test with smaller images first

### Netlify Deployment Fails

1. Verify secrets are set correctly
2. Check Netlify build logs
3. Verify `netlify.toml` paths are correct
4. Test build locally: `npm run build`

### Lighthouse Fails

1. Check scores in Lighthouse report
2. Optimize images: `npm run optimize-images`
3. Review performance bottlenecks
4. Consider adjusting thresholds temporarily

### Module Not Found Errors

```bash
# Rebuild packages
npm run build --workspace=packages/ui-components
npm run build --workspace=packages/utils
npm run build --workspace=packages/image-optimizer
```

## Performance Optimization

### Images

```bash
# Optimize all images
npm run optimize-images

# This generates:
# - WebP versions
# - AVIF versions
# - Responsive variants
# - Compressed originals
```

### Build Size

Check bundle size:
```bash
npm run build
# Review build output for large bundles
```

### Lighthouse Scores

Run locally:
```bash
npm run lighthouse
```

## Monitoring

### Production Monitoring

1. Set up Netlify Analytics
2. Configure error tracking (Sentry recommended)
3. Monitor Lighthouse CI reports
4. Check GitHub Actions for failed workflows

### Health Checks

The scheduled builds workflow runs nightly to:
- Verify all sites are accessible
- Check for broken links
- Regenerate sitemaps
- Sync content

## Backup & Recovery

### Code Backup

- Code is backed up in GitHub
- Use tags for releases: `git tag v1.0.0`

### Content Backup

```bash
# Backup uploaded images
cp -r apps/generator-app/public/uploads /path/to/backup

# Backup generated sites
cp -r generated-sites /path/to/backup
```

### Database Backup (if applicable)

If you add a database later:
- Set up automated backups
- Test restore procedures
- Document recovery process

## Next Steps

1. ✅ Complete setup above
2. 📸 Upload real high-resolution images
3. 🎨 Customize branding colors
4. 📝 Add your content
5. 🚀 Deploy to production
6. 📊 Monitor performance
7. 🔄 Iterate based on feedback

## Support

For issues or questions:
1. Check this guide
2. Review README.md
3. Check GitHub Issues
4. Contact development team

---

**Ready to Build Like A Pro!** 🚀
