# Platform Builder

A comprehensive monorepo for a website-builder platform with a generator app, client-site template, shared UI components, utilities, and deployment infrastructure.

## 🏗️ Project Structure

```
platform-builder/
├── apps/
│   ├── generator/          # Main website generator application (Next.js)
│   │   ├── src/
│   │   │   ├── app/       # App router pages and layouts
│   │   │   ├── components/ # Generator-specific components
│   │   │   ├── store/     # Zustand state management
│   │   │   └── lib/       # Utility functions
│   │   └── public/        # Static assets
│   │
│   └── client-site/       # Template for generated client websites
│       ├── src/
│       │   ├── app/       # Template pages
│       │   └── components/ # Template components
│       └── public/        # Static assets
│
├── packages/
│   ├── ui/                # Shared UI component library
│   │   └── src/
│   │       └── components/ # Button, Input, Card, Textarea, etc.
│   │
│   ├── utils/             # Shared utility functions
│   │   └── src/          # Format, validation utilities
│   │
│   └── scripts/           # Build and deployment scripts
│       └── src/          # CLI tools for building and deploying
│
└── .github/
    └── workflows/         # CI/CD workflows
```

## 🚀 Features

### Generator App
- **Drag-and-drop editor** for building websites
- **Component library** with reusable elements
- **State management** using Zustand
- **Template browser** with pre-designed layouts
- **Image upload API** with validation
- **Real-time preview** of changes

### Client Site Template
- **Responsive design** out of the box
- **Multiple sections**: Hero, About, Services, Contact
- **SEO-friendly** structure
- **Customizable** components

### Shared Packages
- **@platform-builder/ui**: Reusable UI components (Button, Input, Card, Textarea)
- **@platform-builder/utils**: Common utilities (formatting, validation, helpers)
- **@platform-builder/scripts**: Build and deployment automation

## 📦 Installation

```bash
# Install dependencies for all workspaces
npm install

# Install dependencies for a specific workspace
npm install --workspace=apps/generator
```

## 🛠️ Development

```bash
# Start the generator app in development mode
npm run generator:dev

# Start the client site in development mode
npm run client:dev

# Run both apps simultaneously
npm run dev
```

The generator app will be available at `http://localhost:3000`
The client site will be available at `http://localhost:3001`

## 🏗️ Building

```bash
# Build all apps and packages
npm run build

# Build specific app
npm run generator:build
npm run client:build

# Use the build script
npx platform-build
```

## 📝 Available Scripts

### Root Level
- `npm run dev` - Start generator app in development mode
- `npm run build` - Build all workspaces
- `npm run lint` - Lint all workspaces
- `npm run test` - Run tests in all workspaces
- `npm run clean` - Clean node_modules and build artifacts

### Generator App
- `npm run generator:dev` - Start in development mode
- `npm run generator:build` - Build for production

### Client Site
- `npm run client:dev` - Start in development mode
- `npm run client:build` - Build for production

## 🎨 Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Package Manager**: npm workspaces
- **CI/CD**: GitHub Actions
- **Deployment**: Netlify

## 📋 API Endpoints

### Upload API
**POST** `/api/upload`

Upload images for use in the website builder.

**Request**:
- Content-Type: `multipart/form-data`
- Body: `file` (image file)

**Response**:
```json
{
  "success": true,
  "url": "https://...",
  "filename": "image.jpg",
  "size": 12345,
  "type": "image/jpeg"
}
```

**Validation**:
- Allowed types: JPEG, PNG, GIF, WebP
- Max size: 5MB

## 🌐 Deployment

### Netlify Configuration

The project includes Netlify configuration for both apps:

1. **Generator App**: `netlify.toml` in root
2. **Client Site**: `apps/client-site/netlify.toml`

### Environment Variables

Set these secrets in your GitHub repository for CI/CD:

- `NETLIFY_AUTH_TOKEN`: Your Netlify authentication token
- `NETLIFY_SITE_ID`: Site ID for generator app
- `NETLIFY_SITE_ID_CLIENT`: Site ID for client site

### Manual Deployment

```bash
# Deploy generator app
npm run generator:build
netlify deploy --prod --dir=apps/generator/.next

# Deploy client site
npm run client:build
netlify deploy --prod --dir=apps/client-site/.next
```

## 🧪 CI/CD Workflows

### Continuous Integration (`ci.yml`)
Runs on every push and pull request:
- Linting across all workspaces
- Building all apps and packages
- Runs on Node.js 18.x and 20.x

### Deployment (`deploy.yml`)
Runs on pushes to `main`:
- Builds and deploys generator app to Netlify
- Builds and deploys client site to Netlify

## 🔧 Adding New Components

### To the UI Package

1. Create component in `packages/ui/src/components/YourComponent.tsx`
2. Export from `packages/ui/src/index.ts`
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