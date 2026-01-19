#!/usr/bin/env node

const { execSync } = require('child_process');

// Only run migrations on Vercel (production)
if (process.env.VERCEL) {
  console.log('Running database migrations...');
  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
} else {
  console.log('Skipping migrations (not on Vercel)');
  console.log('Run "npx prisma migrate deploy" manually for local development');
}
