# Database Migration Instructions

## Required Migration: Add Public Link to Tests

A database migration needs to be applied to add public link functionality to tests.

### Option 1: Using Prisma Migrate (Recommended)

```bash
npx prisma migrate deploy
```

This will apply the pending migration located at:
`prisma/migrations/20260126230701_add_public_link_to_tests/migration.sql`

### Option 2: Manual SQL Execution

If you prefer to run the SQL manually or if the Prisma migration fails, execute this SQL on your database:

```sql
-- Add publicLink column to Test table
ALTER TABLE "Test" ADD COLUMN "publicLink" TEXT;

-- Create unique index
CREATE UNIQUE INDEX "Test_publicLink_key" ON "Test"("publicLink");

-- Create index for faster lookups
CREATE INDEX "Test_publicLink_idx" ON "Test"("publicLink");
```

### Verification

After applying the migration, verify it worked by checking the Test table schema:

```sql
\d "Test"
```

You should see the `publicLink` column in the table.

### What This Migration Enables

- **Public Test Links**: Each test can have a unique public URL that anyone can access
- **Email-based Self-Registration**: Candidates can enter their email to start a test
- **Automatic Candidate Creation**: New candidates are created automatically when they access a public link
- **Resume Capability**: If a candidate has already started a test, they can resume where they left off
- **Completion Tracking**: Completed tests cannot be retaken via the public link

### Usage After Migration

1. Go to any test in the admin interface
2. Click "Public Link" button in the header
3. Generate a public link
4. Share the link with candidates
5. Candidates access the link, enter their email, and begin the test
