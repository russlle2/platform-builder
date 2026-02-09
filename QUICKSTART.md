# 🚀 Platform Builder - Quick Start

## 📋 Prerequisites

- Node.js 18+ installed
- npm 9+ installed
- Git installed (optional, for version control)

## ⚡ 5-Minute Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server

```bash
npm run generator:dev
```

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
