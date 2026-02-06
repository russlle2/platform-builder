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
```bash
npm install
```

This will install dependencies for all workspaces (apps and packages).

## Development

### Start the Generator App

The generator app is the main website builder interface:

```bash
npm run generator:dev
```

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
