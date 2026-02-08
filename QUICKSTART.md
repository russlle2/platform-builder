<<<<<<< HEAD
# 🚀 Platform Builder - Quick Start

## 📋 Prerequisites

- Node.js 18+ installed
- npm 9+ installed
- Git installed (optional, for version control)

## ⚡ 5-Minute Setup

### 1. Install Dependencies

=======
# Quick Start Guide

This guide will help you get started with the platform-builder monorepo.

## Prerequisites

- Node.js 18.x or later
- npm 9.x or later
- Git

## Installation

1. Clone the repository:
```bash
git clone https://github.com/russlle2/platform-builder.git
cd platform-builder
```

2. Install dependencies:
>>>>>>> a5c68ebea2d96192fedc4f3b06eeb8da0159ca30
```bash
npm install
```

<<<<<<< HEAD
### 2. Start Development Server
=======
This will install dependencies for all workspaces (apps and packages).

## Development

### Start the Generator App

The generator app is the main website builder interface:
>>>>>>> a5c68ebea2d96192fedc4f3b06eeb8da0159ca30

```bash
npm run generator:dev
```

<<<<<<< HEAD
### 3. Open Browser

Visit: **http://localhost:3000**

You should see the industrial-premium HVAC platform with:
- ✅ Mahogany surfaces
- ✅ HVAC background
- ✅ Navigation bar
- ✅ Hero section
- ✅ Live Demo button

### 4. Test the Wizard

1. Click "Reserve your spot" or "Launch Live Build Wizard"
2. Fill in business information
3. Watch the live preview update in real-time
4. Upload test images
5. Switch templates
6. Complete the wizard

## 🎨 Next Steps

### Add Real Images

Upload high-resolution images (1080p minimum) to:
```
apps/generator-app/public/images/
```

Required:
- `hvac-condenser.jpg`
- `mahogany.jpg`
- Template thumbnails
- Proof section images

### Customize Branding

Edit colors in:
```
apps/generator-app/src/app/globals.css
```

### Deploy to Netlify

```bash
# Build for production
npm run build

# Deploy
npm run deploy:production
```

## 📚 Full Documentation

- [Complete Setup Guide](./SETUP.md)
- [Main README](./README.md)
- [Image Assets Guide](apps/generator-app/public/images/README.md)

## 🐛 Common Issues

**Build fails?**
```bash
npm run clean && npm install && npm run build
```

**Port 3000 in use?**
```bash
# Edit package.json to use different port
# Or kill process on port 3000
```

**Images not loading?**
- Check `public/images/` directory exists
- Add placeholder images
- Use absolute paths: `/images/filename.jpg`

## 🎯 Key Commands

| Command | Description |
|---------|-------------|
| `npm run generator:dev` | Start dev server |
| `npm run build` | Build all apps |
| `npm run lint` | Lint code |
| `npm run test` | Run tests |
| `npm run create-client "Name"` | Create client site |

## ✅ Verify Installation

After starting dev server, check:

- [ ] Homepage loads
- [ ] Navigation works
- [ ] Wizard opens
- [ ] Preview updates in real-time
- [ ] Pricing page displays
- [ ] All links navigate correctly

## 🚀 Ready to Build!

You now have a fully functional industrial-premium platform for HVAC and Plumbing professionals.

**Skip the learning curve. Build like a pro.**

---

Need help? See [SETUP.md](./SETUP.md) for detailed instructions.
=======
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Start the Client Site Template

The client site is a template for generated websites:

```bash
npm run client:dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

## Project Structure Overview

```
platform-builder/
├── apps/
│   ├── generator/      # Website builder application
│   └── client-site/    # Template for generated sites
├── packages/
│   ├── ui/            # Shared UI components
│   ├── utils/         # Utility functions
│   └── scripts/       # Build/deploy scripts
└── .github/
    └── workflows/     # CI/CD pipelines
```

## Key Features

### Generator App Features

1. **Home Page** (`/`) - Landing page with feature overview
2. **Editor** (`/editor`) - Drag-and-drop website builder
3. **Templates** (`/templates`) - Pre-designed template gallery
4. **Upload API** (`/api/upload`) - Image upload endpoint

### Using the Editor

1. Navigate to `/editor`
2. Click components in the left sidebar to add them to the canvas
3. Click on a component to select it
4. Edit properties in the right sidebar
5. Upload images using the image upload tool

### State Management

The editor uses Zustand for state management. The store is located at:
`apps/generator/src/store/editorStore.ts`

Key state:
- `components` - Array of components on the canvas
- `selectedComponent` - Currently selected component ID
- Actions for adding, removing, and updating components

## Building for Production

Build all apps:
```bash
npm run build
```

Build specific app:
```bash
npm run generator:build
npm run client:build
```

## Deploying

### Using Netlify

1. Connect your repository to Netlify
2. Set build command: `npm run generator:build`
3. Set publish directory: `apps/generator/.next`

For the client site:
- Build command: `npm run client:build`
- Publish directory: `apps/client-site/.next`

### Using GitHub Actions

The repository includes CI/CD workflows:

- **CI** - Runs on every push and PR (lints and builds)
- **Deploy** - Runs on push to main (deploys to Netlify)

Required secrets:
- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`
- `NETLIFY_SITE_ID_CLIENT`

## Customization

### Adding New Components

1. Create component in `packages/ui/src/components/`
2. Export from `packages/ui/src/index.ts`
3. Use in apps: `import { YourComponent } from '@platform-builder/ui'`

### Adding New Utilities

1. Add function to `packages/utils/src/`
2. Export from `packages/utils/src/index.ts`
3. Use in apps: `import { yourUtil } from '@platform-builder/utils'`

### Modifying Templates

Edit `apps/client-site/src/app/page.tsx` to customize the default template.

## Troubleshooting

### Build Errors

If you encounter build errors:

1. Clean install:
```bash
npm run clean
npm install
```

2. Rebuild:
```bash
npm run build
```

### Dev Server Issues

If the dev server fails to start:

1. Check port availability (3000 for generator, 3001 for client)
2. Kill any running processes:
```bash
lsof -ti:3000 | xargs kill
lsof -ti:3001 | xargs kill
```

### Dependency Issues

Update dependencies:
```bash
npm update
```

## Next Steps

- Explore the codebase
- Add new components to the UI library
- Customize the templates
- Implement additional features
- Set up deployment pipelines

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [npm Workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces)

## Support

For issues and questions, please open an issue on GitHub.
>>>>>>> a5c68ebea2d96192fedc4f3b06eeb8da0159ca30
