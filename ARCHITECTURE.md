# Architecture Overview

This document describes the architecture and design decisions for the Platform Builder monorepo.

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Platform Builder                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐        ┌──────────────────┐      │
│  │  Generator App   │        │  Client Site     │      │
│  │  (Next.js)       │        │  Template        │      │
│  │                  │        │  (Next.js)       │      │
│  │  - Editor UI     │        │  - Landing Page  │      │
│  │  - Templates     │        │  - Sections      │      │
│  │  - Upload API    │        │  - Responsive    │      │
│  └────────┬─────────┘        └──────────────────┘      │
│           │                                             │
│           │ Uses                                        │
│           ↓                                             │
│  ┌──────────────────────────────────────────────┐      │
│  │        Shared Packages                       │      │
│  ├──────────────────────────────────────────────┤      │
│  │  @platform-builder/ui                        │      │
│  │  - Button, Input, Card, Textarea             │      │
│  │                                              │      │
│  │  @platform-builder/utils                     │      │
│  │  - Format, Validation, Helpers               │      │
│  │                                              │      │
│  │  @platform-builder/scripts                   │      │
│  │  - Build, Deploy automation                  │      │
│  └──────────────────────────────────────────────┘      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.x
- **State Management**: Zustand 4.x

### Build & Development

- **Package Manager**: npm workspaces
- **Bundler**: Next.js built-in (Turbopack in dev, Webpack in prod)
- **Linter**: ESLint
- **Type Checker**: TypeScript

### CI/CD & Deployment

- **CI/CD**: GitHub Actions
- **Hosting**: Netlify
- **Version Control**: Git

## Application Architecture

### Generator App

#### Pages (App Router)

```
apps/generator/src/app/
├── layout.tsx          # Root layout
├── page.tsx            # Home page
├── editor/
│   └── page.tsx        # Website editor
├── templates/
│   └── page.tsx        # Template gallery
└── api/
    └── upload/
        └── route.ts    # Image upload endpoint
```

#### State Management

**Store**: `apps/generator/src/store/editorStore.ts`

```typescript
interface EditorState {
  components: Component[]
  selectedComponent: string | null
  addComponent: (component) => void
  removeComponent: (id: string) => void
  updateComponent: (id: string, updates) => void
  selectComponent: (id: string | null) => void
}
```

**State Flow**:
1. User interacts with UI
2. Action dispatched to store
3. Store updates state
4. React re-renders affected components

#### Component Structure

```
ComponentPanel (Left Sidebar)
  ↓ clicks component button
Editor Canvas (Main Area)
  ↓ displays components
Properties Panel (Right Sidebar)
  ↓ edits selected component
```

### Client Site Template

#### Structure

```
apps/client-site/src/app/
├── layout.tsx          # Root layout
└── page.tsx            # Homepage with sections:
                         - Hero
                         - About
                         - Services
                         - Contact
                         - Footer
```

#### Design Principles

- **Responsive**: Mobile-first design
- **Semantic HTML**: Proper heading hierarchy
- **Accessible**: ARIA labels and keyboard navigation
- **SEO-Optimized**: Meta tags and structured data

## Shared Packages

### UI Components (`@platform-builder/ui`)

**Purpose**: Reusable, styled components for consistency

**Components**:
- Button: Primary, secondary, outline variants
- Input: Text, email, password, etc.
- Card: Container with header and footer
- Textarea: Multi-line text input

**Usage**:
```typescript
import { Button, Input } from '@platform-builder/ui'
```

### Utilities (`@platform-builder/utils`)

**Purpose**: Common helper functions

**Modules**:
- `format.ts`: Date, currency, text formatting
- `validation.ts`: Email, URL, phone validation

**Usage**:
```typescript
import { formatDate, isValidEmail } from '@platform-builder/utils'
```

### Scripts (`@platform-builder/scripts`)

**Purpose**: Build and deployment automation

**Scripts**:
- `build.js`: Builds all workspaces
- `deploy.js`: Deployment automation

**Usage**:
```bash
npx platform-build
npx platform-deploy
```

## Data Flow

### Image Upload Flow

```
1. User selects file
   ↓
2. ImageUpload component
   ↓
3. POST /api/upload
   ↓
4. Validation (type, size)
   ↓
5. [Future: Upload to cloud storage]
   ↓
6. Return URL
   ↓
7. Display in UI
```

### Component Creation Flow

```
1. User clicks component button
   ↓
2. ComponentPanel calls addComponent
   ↓
3. Store adds component with unique ID
   ↓
4. Editor canvas re-renders
   ↓
5. Component appears on canvas
```

## API Design

### Upload Endpoint

**POST** `/api/upload`

**Request**:
```
Content-Type: multipart/form-data
Body: { file: File }
```

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
- Allowed types: image/jpeg, image/png, image/gif, image/webp
- Max size: 5MB

## Routing

### Generator App Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing page with features |
| `/editor` | Website builder interface |
| `/templates` | Template gallery |
| `/api/upload` | Image upload endpoint |

### Client Site Routes

| Route | Purpose |
|-------|---------|
| `/` | Homepage with all sections |

## Build Process

### Development

```bash
npm run dev
  ↓
Next.js dev server (port 3000/3001)
  ↓
Hot module reloading
```

### Production

```bash
npm run build
  ↓
1. TypeScript compilation
  ↓
2. Next.js optimization
  ↓
3. Static page generation
  ↓
4. Bundle minimization
  ↓
Output: .next/ directory
```

## Deployment Pipeline

### CI/CD Workflow

```
Push to branch
  ↓
GitHub Actions: CI
  ├─ Install dependencies
  ├─ Lint code
  ├─ Type check
  └─ Build apps
  ↓
Merge to main
  ↓
GitHub Actions: Deploy
  ├─ Build generator app
  ├─ Deploy to Netlify (generator)
  ├─ Build client site
  └─ Deploy to Netlify (client)
```

## Design Patterns

### Component Composition

Components are built using composition:
```typescript
<Card title="Example">
  <Button>Click me</Button>
</Card>
```

### State Management

Zustand for simple, scalable state:
```typescript
const useStore = create((set) => ({
  items: [],
  addItem: (item) => set((state) => ({
    items: [...state.items, item]
  }))
}))
```

### Type Safety

TypeScript interfaces for all data structures:
```typescript
interface Component {
  id: string
  type: string
  content: string
  styles?: Record<string, string>
}
```

## Performance Considerations

### Optimization Strategies

1. **Static Generation**: Pre-render pages at build time
2. **Image Optimization**: Next.js Image component
3. **Code Splitting**: Automatic with Next.js
4. **Tree Shaking**: Remove unused code
5. **Minification**: Compress JavaScript and CSS

### Best Practices

- Use `next/image` for images
- Implement lazy loading for heavy components
- Minimize client-side JavaScript
- Use CSS modules for style encapsulation

## Security

### Current Implementation

1. **File Upload Validation**:
   - Type checking (images only)
   - Size limits (5MB max)
   - Sanitization planned

2. **Environment Variables**:
   - `.env.example` for documentation
   - `.env` files gitignored
   - Secrets stored in GitHub/Netlify

### Future Enhancements

- [ ] Implement authentication
- [ ] Add CSRF protection
- [ ] Content Security Policy
- [ ] Rate limiting on APIs
- [ ] Input sanitization

## Scalability

### Current Architecture

- Monorepo allows independent scaling of apps
- Shared packages reduce duplication
- Stateless architecture for horizontal scaling

### Future Considerations

- Database integration for persistence
- CDN for static assets
- Caching layer (Redis)
- Microservices for complex operations

## Testing Strategy

### Current State

No automated tests currently implemented.

### Recommended Approach

1. **Unit Tests**: Jest + React Testing Library
2. **Integration Tests**: Playwright
3. **E2E Tests**: Cypress or Playwright
4. **Visual Regression**: Percy or Chromatic

## Monitoring & Logging

### Recommended Tools

- **Error Tracking**: Sentry
- **Analytics**: Google Analytics or Plausible
- **Performance**: Vercel Analytics or Web Vitals
- **Logs**: Netlify logs or custom solution

## Future Architecture Goals

1. **Database Integration**: PostgreSQL or MongoDB
2. **Authentication**: NextAuth.js
3. **Real-time Collaboration**: WebSockets
4. **Version Control**: Git-based project history
5. **Plugin System**: Extensible architecture
6. **Theme Engine**: Customizable themes
7. **Export System**: Static site generation
