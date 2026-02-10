#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🚀 Deploying platform-builder...');

const target = process.argv[2] || 'generator';

const deployCommands = {
  generator: 'npm run build --workspace=apps/generator',
  client: 'npm run build --workspace=apps/client-site',
  all: 'npm run build --workspaces --if-present',
};

const command = deployCommands[target] || deployCommands.all;

console.log(`\n📦 Building ${target}...`);

try {
  execSync(command, {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  console.log('\n✅ Build successful!');
  console.log('\n📝 Next steps:');
  console.log('   1. Run your deployment script or');
  console.log('   2. Push to your Git repository to trigger CI/CD');
} catch (error) {
  console.error('\n❌ Build failed');
  process.exit(1);
}
