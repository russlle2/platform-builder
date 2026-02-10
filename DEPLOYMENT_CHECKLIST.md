# 🎯 Deployment Checklist

Use this checklist before deploying to production.

## 📋 Pre-Deployment Checklist

### 1. Images & Assets
- [ ] Upload high-resolution HVAC condenser image (`hvac-condenser.jpg`)
- [ ] Upload mahogany texture image (`mahogany.jpg`)
- [ ] Upload all template thumbnail images
- [ ] Upload proof section example images
- [ ] Verify all image paths in code match uploaded files
- [ ] Run image optimization: `npm run optimize-images`

### 2. Environment Configuration
- [ ] Create `.env.local` with all required variables
- [ ] Set up Netlify sites (dev, staging, production)
- [ ] Configure custom domains on Netlify
- [ ] Add environment variables to each Netlify site
- [ ] Set up GitHub repository secrets:
  - `NETLIFY_AUTH_TOKEN`
  - `NETLIFY_SITE_ID`
  - `NETLIFY_SITE_ID_CLIENT`
  - `LHCI_GITHUB_APP_TOKEN` (optional)

### 3. Code Review
- [ ] Run linter: `npm run lint`
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Fix all errors and warnings
- [ ] Review all TODO comments in code
- [ ] Update any placeholder text
- [ ] Verify all links work correctly

### 4. Testing
- [ ] Test locally: `npm run dev`
- [ ] Test homepage loads correctly
- [ ] Test navigation to all pages
- [ ] Test wizard flow end-to-end
- [ ] Test image upload functionality
- [ ] Test template switching in wizard
- [ ] Test live preview updates
- [ ] Test on mobile devices
- [ ] Test on different browsers (Chrome, Firefox, Safari, Edge)
- [ ] Run build: `npm run build`
- [ ] Test production build locally: `npm start`

### 5. Performance
- [ ] Run Lighthouse audit locally
- [ ] Verify performance score > 90%
- [ ] Verify accessibility score > 90%
- [ ] Check bundle sizes are reasonable
- [ ] Optimize any large assets
- [ ] Enable compression on Netlify

### 6. Security
- [ ] Run security audit: `npm audit`
- [ ] Fix high/critical vulnerabilities
- [ ] Review exposed environment variables
- [ ] Verify API endpoints have proper validation
- [ ] Test file upload size limits
- [ ] Test file type validation
- [ ] Review CORS settings

### 7. CI/CD
- [ ] Verify all GitHub Actions workflows pass
- [ ] Test preview deployment on a branch
- [ ] Verify preview URL is commented on PR
- [ ] Test merge to main triggers production deployment
- [ ] Verify Lighthouse CI is working
- [ ] Check scheduled builds are configured

### 8. Monitoring & Analytics
- [ ] Set up Netlify Analytics
- [ ] Configure error tracking (Sentry recommended)
- [ ] Set up uptime monitoring
- [ ] Configure build notifications
- [ ] Set up performance monitoring
- [ ] Review log aggregation setup

### 9. Content
- [ ] Review all page copy for accuracy
- [ ] Verify pricing is correct and up-to-date
- [ ] Check contact information
- [ ] Review FAQ section
- [ ] Verify scarcity messaging
- [ ] Check all CTAs are clear and actionable

### 10. Legal & Compliance
- [ ] Add privacy policy page
- [ ] Add terms of service page
- [ ] Add GDPR compliance (if applicable)
- [ ] Review data collection practices
- [ ] Add cookie consent (if needed)
- [ ] Verify accessibility compliance

### 11. Documentation
- [ ] Update README with production URLs
- [ ] Document any manual steps required
- [ ] Create runbook for common issues
- [ ] Document rollback procedure
- [ ] Update API documentation
- [ ] Create user guide (if needed)

### 12. Backup & Recovery
- [ ] Backup current production (if updating)
- [ ] Document database backup process (if applicable)
- [ ] Test restore procedure
- [ ] Document rollback steps
- [ ] Note commit hash for release
- [ ] Tag release: `git tag v1.0.0`

## 🚀 Deployment Steps

### Development Deployment
```bash
1. npm run build
2. npm run deploy:dev
3. Test at dev.yourdomain.com
4. Verify functionality
```

### Staging Deployment
```bash
1. Merge to staging branch
2. Verify GitHub Actions deployment
3. Test at staging.yourdomain.com
4. Full QA testing
5. Load testing (if applicable)
```

### Production Deployment
```bash
1. Merge to main branch
2. Monitor GitHub Actions
3. Wait for successful deployment
4. Verify at yourdomain.com
5. Smoke test critical paths
6. Monitor error logs
7. Check analytics
```

## 🔍 Post-Deployment Verification

### Immediately After Deployment
- [ ] Homepage loads correctly
- [ ] Navigation works on all pages
- [ ] Wizard flow completes successfully
- [ ] Image upload works
- [ ] Pricing page displays correctly
- [ ] All links are functional
- [ ] Mobile version works
- [ ] No console errors
- [ ] SSL certificate is valid
- [ ] Custom domain resolves

### Within 24 Hours
- [ ] Monitor error rates
- [ ] Review performance metrics
- [ ] Check user analytics
- [ ] Verify SEO meta tags
- [ ] Check sitemap generation
- [ ] Review server logs
- [ ] Test edge cases
- [ ] Gather user feedback

### Within 1 Week
- [ ] Review performance trends
- [ ] Analyze user behavior
- [ ] Check conversion rates
- [ ] Review support tickets
- [ ] Plan iteration improvements
- [ ] Update documentation based on findings

## 🐛 Rollback Procedure

If critical issues are discovered:

### Immediate Rollback
```bash
1. Revert to previous commit: git revert HEAD
2. Push to main: git push origin main
3. Monitor deployment in GitHub Actions
4. Verify rollback successful
```

### Netlify Manual Rollback
```bash
1. Go to Netlify dashboard
2. Navigate to Deploys
3. Find last successful deploy
4. Click "Publish deploy"
5. Verify site is restored
```

### Communication
- [ ] Notify team of rollback
- [ ] Document issue found
- [ ] Create hotfix plan
- [ ] Schedule fix deployment
- [ ] Update stakeholders

## 📊 Success Criteria

Deployment is considered successful when:
- ✅ All pages load without errors
- ✅ Performance scores > 90%
- ✅ Accessibility scores > 90%
- ✅ No critical console errors
- ✅ All user flows complete successfully
- ✅ Mobile experience is smooth
- ✅ Error rate < 1%
- ✅ Response times < 2 seconds
- ✅ Zero security vulnerabilities
- ✅ Monitoring and alerts active

## 🎉 Launch Complete!

Once all checklist items are complete:
- [ ] Announce launch to team
- [ ] Update status page (if applicable)
- [ ] Send launch notification
- [ ] Post on social media (if applicable)
- [ ] Monitor closely for first 48 hours
- [ ] Celebrate! 🎊

---

**Skip the learning curve. Build like a pro.** 🚀
