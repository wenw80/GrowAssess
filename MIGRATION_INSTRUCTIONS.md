# Database Migration Instructions

## Required Migrations

Three database migrations need to be applied:

1. **Add Public Link to Tests** - Enables public test links with email capture
2. **Add Requirements Field to Tests** - Stores generation prompts and test requirements
3. **Add Test Snapshots to Assignments** - 🚨 CRITICAL: Preserves test integrity

---

## Migration 1: Add Public Link

### Option 1: Using Prisma Migrate (Recommended)

```bash
npx prisma migrate deploy
```

This will apply the pending migration located at:
`prisma/migrations/20260126230701_add_public_link_to_tests/migration.sql`

### Option 2: Manual SQL Execution

```sql
-- Add publicLink column to Test table
ALTER TABLE "Test" ADD COLUMN "publicLink" TEXT;

-- Create unique index
CREATE UNIQUE INDEX "Test_publicLink_key" ON "Test"("publicLink");

-- Create index for faster lookups
CREATE INDEX "Test_publicLink_idx" ON "Test"("publicLink");
```

### Verification

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

```sql
-- Add requirements column to Test table
ALTER TABLE "Test" ADD COLUMN "requirements" TEXT;
```

### Verification

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

---

## Migration 3: Add Test Snapshots (🚨 CRITICAL)

### Why This is Critical

**Problem**: Previously, editing a test would change it for ALL assignments (past, present, future). This meant:
- Completed tests could be retroactively modified
- Grading was based on the current test, not the test the candidate took
- No audit trail of what test was actually administered

**Solution**: Test Snapshots capture the exact test structure at assignment time, making past tests immutable.

### Option 1: Using Prisma Migrate (Recommended)

```bash
npx prisma migrate deploy
```

This will apply the pending migration located at:
`prisma/migrations/20260127091420_add_test_snapshot_to_assignments/migration.sql`

### Option 2: Manual SQL Execution

```sql
-- Add testSnapshot column with temporary default
ALTER TABLE "TestAssignment" ADD COLUMN "testSnapshot" TEXT NOT NULL DEFAULT '{}';

-- Remove default (new assignments will require snapshot)
ALTER TABLE "TestAssignment" ALTER COLUMN "testSnapshot" DROP DEFAULT;
```

### ⚠️ IMPORTANT: Backfill Existing Assignments

After applying the migration, you MUST backfill snapshots for existing assignments:

```sql
-- Run this from backfill-test-snapshots.sql
UPDATE "TestAssignment" a
SET "testSnapshot" = (
    SELECT json_build_object(
        'title', t.title,
        'description', t.description,
        'requirements', t.requirements,
        'tags', t.tags,
        'durationMinutes', t."durationMinutes",
        'questions', (
            SELECT json_agg(
                json_build_object(
                    'id', q.id,
                    'type', q.type,
                    'content', q.content,
                    'options', q.options,
                    'correctAnswer', q."correctAnswer",
                    'timeLimitSeconds', q."timeLimitSeconds",
                    'points', q.points,
                    'order', q."order"
                )
                ORDER BY q."order"
            )
            FROM "Question" q
            WHERE q."testId" = t.id
        )
    )::text
    FROM "Test" t
    WHERE t.id = a."testId"
)
WHERE a."testSnapshot" = '{}' OR a."testSnapshot" IS NULL;
```

### Verification

```sql
-- Check that all assignments have snapshots
SELECT
    COUNT(*) as total_assignments,
    COUNT(CASE WHEN "testSnapshot" != '{}' AND "testSnapshot" IS NOT NULL THEN 1 END) as with_snapshot,
    COUNT(CASE WHEN "testSnapshot" = '{}' OR "testSnapshot" IS NULL THEN 1 END) as missing_snapshot
FROM "TestAssignment";

-- Should show 0 missing_snapshot

-- View snapshot details
SELECT
    a.id,
    a.status,
    t.title as test_title,
    (a."testSnapshot"::json->>'title') as snapshot_title,
    json_array_length((a."testSnapshot"::json->'questions')::json) as question_count
FROM "TestAssignment" a
INNER JOIN "Test" t ON a."testId" = t.id
LIMIT 10;
```

### What This Migration Enables

- **Test Integrity**: Past tests are immutable - editing templates doesn't affect completed tests
- **Accurate Grading**: Always graded against the exact test the candidate took
- **Audit Trail**: Each assignment has full history of what test was administered
- **Safe Editing**: Improve test templates without affecting past results
- **Compliance**: Required for credible, defensible assessments

### How It Works

**Before (Broken)**:
1. Admin creates Test with Questions
2. Admin assigns Test to Candidate
3. Candidate takes test
4. **Admin edits Test (changes questions/points)**
5. Grading uses NEW test → WRONG RESULTS

**After (Fixed)**:
1. Admin creates Test with Questions
2. Admin assigns Test to Candidate → **Snapshot created**
3. Candidate takes test using snapshot
4. Admin edits Test template
5. Grading uses snapshot → CORRECT RESULTS
6. NEW assignments get NEW snapshot

### Impact on Features

All features now use snapshots:
- ✅ Test taking reads from snapshot
- ✅ Auto-grading scores against snapshot
- ✅ Manual grading shows snapshot questions
- ✅ Reports calculate from snapshot
- ✅ Template edits only affect new assignments

---

## Running All Migrations

To run all pending migrations at once:

```bash
# Using Prisma CLI (recommended)
npx prisma migrate deploy

# Then backfill test snapshots
psql $DATABASE_URL -f backfill-test-snapshots.sql
```

---

## Troubleshooting

### Permission Denied Errors

If you see `P1010: User denied access`, you may need to run SQL manually:
1. Connect to your database with appropriate credentials
2. Run the SQL from each migration file
3. Run the backfill script

### Verifying Success

```sql
-- Check Test table
\d "Test"
-- Should see: publicLink, requirements

-- Check TestAssignment table
\d "TestAssignment"
-- Should see: testSnapshot

-- Check snapshots are populated
SELECT COUNT(*) FROM "TestAssignment" WHERE "testSnapshot" != '{}';
-- Should equal total number of assignments
```
