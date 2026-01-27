-- Check for orphaned responses (responses with no matching question)
SELECT
    r.id as response_id,
    r."assignmentId",
    r."questionId",
    r.answer,
    r.score,
    r."isCorrect",
    a."testId",
    t.title as test_title,
    c.email as candidate_email
FROM "Response" r
LEFT JOIN "Question" q ON r."questionId" = q.id
LEFT JOIN "TestAssignment" a ON r."assignmentId" = a.id
LEFT JOIN "Test" t ON a."testId" = t.id
LEFT JOIN "Candidate" c ON a."candidateId" = c.id
WHERE q.id IS NULL
ORDER BY a."testId", r."assignmentId";
