# Image Assets Directory

This directory contains placeholder image paths for the platform.

## Required Images

Please upload the following high-resolution images (1080p minimum):

### Background Images
- `hvac-condenser.jpg` - Aerial top-down HVAC condenser (90° vertical angle)
- `hvac-background.jpg` - Industrial HVAC background
- `mahogany.jpg` - Mahogany wood texture for surfaces

### Template Thumbnails
- `template-modern-hvac.jpg`
- `template-industrial.jpg`
- `template-comfort.jpg`
- `template-plumbing.jpg`
- `template-emergency.jpg`
- `template-residential.jpg`
- `template-1.jpg` through `template-9.jpg`

### Proof Section
- `proof-1.jpg` through `proof-6.jpg` - Example client websites

### Logos & Placeholders
- `logo-placeholder.png` - Placeholder logo

## Image Specifications

- **Format**: JPG, PNG, or WebP
- **Resolution**: Minimum 1080p (1920x1080)
- **Quality**: High quality, professional photography
- **File Size**: Optimize for web (under 500KB per image)
- **Style**: Industrial, professional, HVAC/plumbing relevant

## Optimization

All images can be automatically optimized using the image optimization scripts:

```bash
npm run optimize-images
```

This will:
- Compress images
- Convert to WebP format
- Generate responsive variants
- Store optimized versions in the `optimized/` subdirectory
