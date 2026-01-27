-- EMERGENCY DATA RECOVERY SCRIPT
-- This script attempts to recover orphaned responses by matching them to new questions
-- based on question order within the same test

-- Step 1: Create a temporary table to store the mapping
CREATE TEMP TABLE question_mapping AS
WITH orphaned_responses AS (
    SELECT DISTINCT
        r."questionId" as old_question_id,
        a."testId",
        ROW_NUMBER() OVER (PARTITION BY a."testId", r."questionId" ORDER BY r.id) as rn
    FROM "Response" r
    LEFT JOIN "Question" q ON r."questionId" = q.id
    INNER JOIN "TestAssignment" a ON r."assignmentId" = a.id
    WHERE q.id IS NULL
),
current_questions AS (
    SELECT
        q.id as new_question_id,
        q."testId",
        q."order",
        ROW_NUMBER() OVER (PARTITION BY q."testId" ORDER BY q."order") as position
    FROM "Question" q
)
SELECT DISTINCT ON (old_question_id)
    or1.old_question_id,
    cq.new_question_id,
    or1."testId"
FROM orphaned_responses or1
CROSS JOIN LATERAL (
    SELECT
        q.id as new_question_id,
        q."testId"
    FROM "Question" q
    WHERE q."testId" = or1."testId"
    ORDER BY q."order"
    LIMIT 1 OFFSET (
        SELECT COUNT(DISTINCT r2."questionId") - 1
        FROM "Response" r2
        INNER JOIN "TestAssignment" a2 ON r2."assignmentId" = a2.id
        WHERE a2."testId" = or1."testId"
        AND r2."questionId" = or1.old_question_id
        AND r2.id < (SELECT MIN(id) FROM "Response" WHERE "questionId" = or1.old_question_id)
    )
) cq;

-- Step 2: Show what will be updated (DRY RUN)
SELECT
    r.id as response_id,
    r."questionId" as old_question_id,
    qm.new_question_id,
    r.answer,
    r.score,
    t.title as test_title,
    c.email as candidate_email
FROM "Response" r
INNER JOIN question_mapping qm ON r."questionId" = qm.old_question_id
INNER JOIN "TestAssignment" a ON r."assignmentId" = a.id
INNER JOIN "Test" t ON a."testId" = t.id
INNER JOIN "Candidate" c ON a."candidateId" = c.id
ORDER BY t.title, c.email, r.id;

-- Step 3: UNCOMMENT THIS TO ACTUALLY UPDATE THE DATA
-- WARNING: This will modify your database. Review the dry run output first!
/*
UPDATE "Response" r
SET "questionId" = qm.new_question_id
FROM question_mapping qm
WHERE r."questionId" = qm.old_question_id;
*/

-- Step 4: Verify the fix
/*
SELECT
    t.title,
    COUNT(DISTINCT a."candidateId") as affected_candidates,
    COUNT(r.id) as responses_recovered
FROM "Response" r
INNER JOIN "TestAssignment" a ON r."assignmentId" = a.id
INNER JOIN "Test" t ON a."testId" = t.id
INNER JOIN "Question" q ON r."questionId" = q.id
GROUP BY t.title;
*/
