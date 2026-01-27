# Database Migration Instructions

## Required Migrations

Two database migrations need to be applied to enable new features:

1. **Add Public Link to Tests** - Enables public test links with email capture
2. **Add Requirements Field to Tests** - Stores generation prompts and test requirements

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

---

## Migration 2: Add Requirements Field

### Option 1: Using Prisma Migrate (Recommended)

```bash
npx prisma migrate deploy
```

This will apply the pending migration located at:
`prisma/migrations/20260127085909_add_requirements_to_tests/migration.sql`

### Option 2: Manual SQL Execution

If you prefer to run the SQL manually:

```sql
-- Add requirements column to Test table
ALTER TABLE "Test" ADD COLUMN "requirements" TEXT;
```

### Verification

After applying the migration, verify it worked:

```sql
\d "Test"
```

You should see the `requirements` column in the table.

### What This Migration Enables

- **Requirements Field**: Large text field to store AI generation prompts or test requirements
- **Documentation**: Keep track of how tests were created and their purpose
- **JSON Import/Export**: Requirements are preserved when exporting and importing tests
- **Edit Anytime**: Field can be added or edited on the test detail page

### Usage After Migration

1. Create or edit any test
2. Find the "Requirements / Generation Prompt" field (after description)
3. Paste the AI prompt used to generate the test or add notes
4. Save the test - requirements are preserved
5. When exporting to JSON, requirements are included
