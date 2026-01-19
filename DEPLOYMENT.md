# GrowAssess - Deployment Guide

## Deploying to Vercel

### Prerequisites
- GitHub account
- Vercel account (free tier available)
- PostgreSQL database (Vercel Postgres, Neon, or Supabase)

### Step 1: Prepare Your Repository

Ensure your code is pushed to GitHub:
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Step 2: Deploy to Vercel

1. Visit [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"**
3. Select your `growassess` repository
4. Vercel will automatically detect Next.js configuration

### Step 3: Set Up PostgreSQL Database

**Option A: Vercel Postgres (Recommended)**
1. In your Vercel project dashboard, go to **Storage** tab
2. Click **"Create Database"** → Select **"Postgres"**
3. Vercel will automatically set the `DATABASE_URL` environment variable

**Option B: Neon (Free PostgreSQL)**
1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project
3. Copy the connection string (it looks like: `postgresql://user:password@host/database`)
4. Add it to Vercel environment variables (see Step 4)

**Option C: Supabase (Free PostgreSQL)**
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to Project Settings → Database → Connection string
4. Copy the connection pooler string
5. Add it to Vercel environment variables (see Step 4)

### Step 4: Configure Environment Variables

In your Vercel project → **Settings** → **Environment Variables**, add:

| Variable | Value | Description |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string |
| `ADMIN_PASSWORD` | Your secure password | Admin login password |

**Important:** For production, change the schema provider:
- The app uses SQLite locally (`provider = "sqlite"`)
- For Vercel, you'll need to temporarily change `prisma/schema.prisma`:
  ```prisma
  datasource db {
    provider = "postgresql"  // Change from "sqlite"
    url      = env("DATABASE_URL")
  }
  ```
- Commit this change before deploying
- Or use a deployment hook to modify it automatically

### Step 5: Deploy

1. Click **"Deploy"**
2. Vercel will:
   - Install dependencies
   - Run `prisma generate`
   - Build your Next.js app
   - Deploy to production

### Step 6: Run Database Migrations

After first deployment, you need to set up the database schema:

1. Install Vercel CLI locally:
   ```bash
   npm i -g vercel
   ```

2. Link your project:
   ```bash
   vercel link
   ```

3. Pull environment variables:
   ```bash
   vercel env pull .env.production
   ```

4. Run migrations:
   ```bash
   DATABASE_URL="your-production-db-url" npx prisma migrate deploy
   ```

   Or use Vercel CLI:
   ```bash
   vercel env pull
   npx prisma migrate deploy
   ```

### Step 7: Access Your App

Your app will be live at: `https://your-project-name.vercel.app`

## Post-Deployment

### Seed Initial Data (Optional)

If you want to import your existing test data:
1. Export from local SQLite database
2. Import to PostgreSQL database using Prisma Studio or SQL

### Custom Domain (Optional)

1. Go to Vercel project → **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions

## Important Notes

### Schema Provider Differences

- **Local Development**: Uses SQLite (`file:./dev.db`)
- **Production**: Uses PostgreSQL

You'll need to maintain two configurations or use environment-based schema generation.

### Recommended Approach: Environment-Based Schema

Create a script to switch between SQLite and PostgreSQL:

```json
// package.json
"scripts": {
  "dev": "next dev",
  "build": "npm run prisma:generate && next build",
  "prisma:generate": "prisma generate",
  "deploy:setup": "node scripts/setup-production-db.js"
}
```

### Alternative: Use PostgreSQL Locally

To avoid provider switching issues, use PostgreSQL locally too:
1. Install PostgreSQL or use Docker
2. Update `.env` with local PostgreSQL connection
3. Run `prisma migrate dev`

## Troubleshooting

### Build Fails with Prisma Error
- Ensure `DATABASE_URL` environment variable is set
- Verify the database provider in `schema.prisma` matches your database type

### Database Connection Issues
- Check connection string format
- Ensure SSL mode is included for cloud databases: `?sslmode=require`
- Verify database is accessible from Vercel's IP ranges

### Missing Tables After Deployment
- Run `prisma migrate deploy` to apply migrations
- Check Vercel build logs for migration errors

## Support

For issues or questions:
- Check Vercel deployment logs
- Review Prisma migration status
- Verify environment variables are set correctly
