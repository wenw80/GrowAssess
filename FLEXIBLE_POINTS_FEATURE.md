# Flexible Points Assignment Feature

## Overview

The test system now supports flexible point assignment for each answer option in multiple choice questions. This allows for:
- Partial credit for partially correct answers
- Different point values for different quality of answers
- Risk/reward mechanics
- More nuanced scoring

## JSON Import Format

### Traditional MCQ (Simple Format)

The traditional format still works with backwards compatibility:

```json
{
  "type": "mcq",
  "content": "What is 2 + 2?",
  "options": ["3", "4", "5", "6"],
  "correctAnswer": 1,
  "points": 10
}
```

In this format:
- The correct answer (index 1 = "4") receives full points (10 points)
- All other answers receive 0 points

### Flexible Points Format (New)

You can now specify points for each individual answer:

```json
{
  "type": "mcq",
  "content": "Select the BEST answer. Partial credit available.",
  "options": [
    {
      "text": "Excellent answer",
      "points": 10
    },
    {
      "text": "Good answer",
      "points": 7
    },
    {
      "text": "Partial answer",
      "points": 3
    },
    {
      "text": "Incorrect",
      "points": 0
    }
  ],
  "correctAnswer": 0,
  "points": 10
}
```

In this format:
- Each option has its own point value
- The `correctAnswer` field still indicates which option is marked as "correct" (shown with a radio button in the editor)
- The `points` field at the question level represents the maximum possible points for reporting purposes

## UI Changes

When creating or editing tests in the admin interface:

1. **Traditional MCQ Creation**: When you add a new MCQ question, it defaults to:
   - First option: points = question points (correct answer)
   - Second option: points = 0 (incorrect answer)

2. **Points Input**: Each option now has a points input field where you can specify how many points that answer is worth

3. **Correct Answer Marker**: The radio button still marks which answer is considered the "official" correct answer

## Scoring Logic

When a candidate submits an answer:
1. The system looks up the selected option
2. Awards the points specified for that option
3. The `isCorrect` field is set based on whether the answer matches the `correctAnswer` field
4. For backwards compatibility, old tests without per-option points still use binary scoring (full points or 0)

## Use Cases

### 1. Partial Credit
```json
{
  "content": "What is the capital of France?",
  "options": [
    {"text": "Paris", "points": 10},
    {"text": "Lyon (major city but not capital)", "points": 3},
    {"text": "Berlin", "points": 0},
    {"text": "Madrid", "points": 0}
  ]
}
```

### 2. Multiple Levels of Correctness
```json
{
  "content": "Which best describes photosynthesis?",
  "options": [
    {"text": "Complete technical definition with all components", "points": 10},
    {"text": "Good definition with most components", "points": 7},
    {"text": "Basic definition with key concept", "points": 4},
    {"text": "Incorrect definition", "points": 0}
  ]
}
```

### 3. Risk Assessment / Confidence Weighting
```json
{
  "content": "How confident are you in your previous answer?",
  "options": [
    {"text": "Very confident (2x multiplier)", "points": 20},
    {"text": "Confident (normal)", "points": 10},
    {"text": "Somewhat confident (reduced)", "points": 5},
    {"text": "Not confident (minimal)", "points": 2}
  ]
}
```

## Backwards Compatibility

All existing tests continue to work without modification:
- Old tests with simple string options are automatically converted to the new format
- The correct answer gets the question's total points
- Incorrect answers get 0 points
- When editing old tests, the UI displays the current point values
- Tests can be re-saved with the new format after editing

## Technical Implementation

### Files Modified
1. `src/types/index.ts` - Added `points` field to `MCQOption` interface
2. `src/app/api/tests/import/route.ts` - Updated import logic to handle both formats
3. `src/app/api/responses/route.ts` - Updated scoring logic to use per-option points
4. `src/components/tests/QuestionEditor.tsx` - Added points input for each option
5. `src/components/tests/TestForm.tsx` - Updated to handle new format and provide backwards compatibility

### Database Schema
No database migration needed! The `options` field is already stored as a JSON string, so the new format is stored in the same field with an additional `points` property.

## Example

See `example-test-with-flexible-points.json` for a complete example test demonstrating various use cases.
