#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🏗️  Building platform-builder monorepo...');

const workspaces = ['packages/ui-components', 'packages/utils', 'packages/image-optimizer', 'apps/generator-app', 'apps/client-template'];

workspaces.forEach((workspace) => {
  console.log(`\n📦 Building ${workspace}...`);
  try {
    execSync(`npm run build --workspace=${workspace} --if-present`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log(`✅ ${workspace} built successfully`);
  } catch (error) {
    console.error(`❌ Failed to build ${workspace}`);
    process.exit(1);
  }
});

console.log('\n✨ Build completed successfully!');
