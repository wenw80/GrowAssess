-- Backfill script to populate testSnapshot for existing assignments
-- Run this AFTER applying the migration

-- This creates a snapshot of the test as it currently exists and stores it in the assignment
-- Note: This assumes the test hasn't changed since the assignment was created
-- For better accuracy, you'd need historical test data

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

-- Verify the backfill
SELECT
    a.id,
    a.status,
    t.title,
    length(a."testSnapshot") as snapshot_size,
    (a."testSnapshot"::json->>'title') as snapshot_title,
    json_array_length((a."testSnapshot"::json->'questions')::json) as question_count
FROM "TestAssignment" a
INNER JOIN "Test" t ON a."testId" = t.id
ORDER BY a."assignedAt" DESC
LIMIT 10;
