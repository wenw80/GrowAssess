#!/usr/bin/env node

const { execSync } = require('child_process');

// Only run migrations on Vercel (production)
if (process.env.VERCEL) {
  console.log('Running database schema sync...');
  try {
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    console.log('Database schema sync completed successfully');
  } catch (error) {
    console.error('Database sync failed:', error.message);
    process.exit(1);
  }
} else {
  console.log('Skipping database sync (not on Vercel)');
  console.log('Run "npx prisma db push" manually for local development');
}
