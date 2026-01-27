# EMERGENCY DATA RECOVERY - Lost Test Responses

## What Happened

**CRITICAL BUG**: The test update logic was deleting all questions and recreating them with new IDs every time a test was edited. This broke the link between existing responses and questions.

**Root Cause**: Lines 48-51 in `src/app/api/tests/[id]/route.ts`
```typescript
// Delete existing questions and create new ones
await prisma.question.deleteMany({
  where: { testId: id },
});
```

**Impact**: When you edited the QSR Advanced test (probably to add the requirements field), all questions were deleted and recreated with new IDs. Existing responses now reference old (deleted) question IDs.

**Status**:
- ✅ Bug is now FIXED in the latest commit
- ⚠️ Data recovery is needed for affected tests

---

## Step 1: Check for Orphaned Responses

Run this query to see which responses are orphaned:

```sql
SELECT
    COUNT(*) as orphaned_count,
    t.title,
    t.id as test_id
FROM "Response" r
LEFT JOIN "Question" q ON r."questionId" = q.id
LEFT JOIN "TestAssignment" a ON r."assignmentId" = a.id
LEFT JOIN "Test" t ON a."testId" = t.id
WHERE q.id IS NULL
GROUP BY t.title, t.id
ORDER BY orphaned_count DESC;
```

---

## Step 2: Recovery Strategy

**IF** the test structure hasn't changed (same number of questions, same order), we can recover the data by matching responses to questions based on order position.

### Recovery Query (DRY RUN - Check First)

```sql
-- Create a mapping of old question IDs to new question IDs based on order
WITH orphaned_responses AS (
    SELECT DISTINCT
        r."questionId" as old_question_id,
        a."testId"
    FROM "Response" r
    LEFT JOIN "Question" q ON r."questionId" = q.id
    INNER JOIN "TestAssignment" a ON r."assignmentId" = a.id
    WHERE q.id IS NULL
),
question_order_mapping AS (
    SELECT
        old_question_id,
        or1."testId",
        ROW_NUMBER() OVER (PARTITION BY or1."testId" ORDER BY old_question_id) as old_order
    FROM orphaned_responses or1
),
new_question_order AS (
    SELECT
        id as new_question_id,
        "testId",
        "order",
        ROW_NUMBER() OVER (PARTITION BY "testId" ORDER BY "order") as new_order
    FROM "Question"
)
SELECT
    qom.old_question_id,
    nqo.new_question_id,
    qom."testId",
    t.title,
    COUNT(r.id) as affected_responses
FROM question_order_mapping qom
INNER JOIN new_question_order nqo
    ON qom."testId" = nqo."testId"
    AND qom.old_order = nqo.new_order
INNER JOIN "Test" t ON qom."testId" = t.id
LEFT JOIN "Response" r ON r."questionId" = qom.old_question_id
GROUP BY qom.old_question_id, nqo.new_question_id, qom."testId", t.title
ORDER BY t.title, qom.old_order;
```

### If the mapping looks correct, run this UPDATE:

```sql
-- ACTUAL UPDATE - Review dry run first!
WITH orphaned_responses AS (
    SELECT DISTINCT
        r."questionId" as old_question_id,
        a."testId"
    FROM "Response" r
    LEFT JOIN "Question" q ON r."questionId" = q.id
    INNER JOIN "TestAssignment" a ON r."assignmentId" = a.id
    WHERE q.id IS NULL
),
question_order_mapping AS (
    SELECT
        old_question_id,
        or1."testId",
        ROW_NUMBER() OVER (PARTITION BY or1."testId" ORDER BY old_question_id) as old_order
    FROM orphaned_responses or1
),
new_question_order AS (
    SELECT
        id as new_question_id,
        "testId",
        "order",
        ROW_NUMBER() OVER (PARTITION BY "testId" ORDER BY "order") as new_order
    FROM "Question"
),
mapping AS (
    SELECT
        qom.old_question_id,
        nqo.new_question_id
    FROM question_order_mapping qom
    INNER JOIN new_question_order nqo
        ON qom."testId" = nqo."testId"
        AND qom.old_order = nqo.new_order
)
UPDATE "Response" r
SET "questionId" = m.new_question_id
FROM mapping m
WHERE r."questionId" = m.old_question_id;
```

---

## Step 3: Verify Recovery

After running the update, verify the fix:

```sql
-- Check if there are any remaining orphaned responses
SELECT COUNT(*) as remaining_orphaned
FROM "Response" r
LEFT JOIN "Question" q ON r."questionId" = q.id
WHERE q.id IS NULL;

-- Should return 0 if successful
```

---

## Prevention

The bug has been fixed in the latest commit. The new logic:
1. ✅ Preserves question IDs when updating
2. ✅ Only deletes questions that were removed
3. ✅ Only creates new questions that were added
4. ✅ Updates existing questions in place

**No data loss will occur from future test edits.**

---

## Alternative: Restore from Backup

If you have a database backup from before editing the test, you can:
1. Export just the Response records for the affected test
2. Restore them after recovery

---

## Need Help?

If the recovery is complex or you're unsure, please:
1. DO NOT run the UPDATE query yet
2. Share the output of the "DRY RUN" query
3. I can help create a custom recovery script for your specific situation
