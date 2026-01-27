# GrowAssess Test JSON Format Specification

## Overview
This document describes the JSON format for creating cognitive tests in GrowAssess. Use this specification to generate tests programmatically or with AI assistance.

## Schema

```json
{
  "title": "string (required)",
  "description": "string (optional)",
  "category": "string (optional)",
  "durationMinutes": "number (optional)",
  "questions": "array of Question objects (required)"
}
```

## Question Types

### 1. Multiple Choice (`mcq`)

> **⚠️ IMPORTANT**: All MCQ questions **MUST** include the `correctAnswer` field (zero-based index). This is required even when using flexible points scoring.

**Simple Format (Binary Scoring):**
```json
{
  "type": "mcq",
  "content": "The question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0,
  "points": 1
}
```
- `options`: Array of 2-6 answer choices (strings)
- `correctAnswer`: **REQUIRED** - Zero-based index of the correct option (0 = first option)
- `points`: Points awarded for correct answer (default: 1)
- All incorrect answers receive 0 points

**Flexible Points Format (Partial Credit):**
```json
{
  "type": "mcq",
  "content": "Select the BEST answer about X",
  "options": [
    {"text": "Excellent answer", "points": 10},
    {"text": "Good answer", "points": 7},
    {"text": "Partial answer", "points": 3},
    {"text": "Incorrect", "points": 0}
  ],
  "correctAnswer": 0,
  "points": 10
}
```
- `options`: Array of objects with `text` and `points` fields
- Each option specifies its own point value
- Allows for partial credit and nuanced scoring
- `correctAnswer`: **REQUIRED** - Zero-based index of the "best" answer (0 = first option)
- `points`: Represents maximum possible points for the question

**IMPORTANT**: The `correctAnswer` field is **always required** for MCQ questions, even when using flexible points. It indicates which answer is considered the "correct" or "best" choice for administrative and UI purposes, while the per-option points determine the actual score awarded.

### 2. Free Text (`freetext`)
```json
{
  "type": "freetext",
  "content": "The question or prompt",
  "points": 5
}
```
- Open-ended response, manually graded
- `points`: Maximum points possible (default: 1)

### 3. Timed Task (`timed`)
```json
{
  "type": "timed",
  "content": "The task description",
  "timeLimitSeconds": 120,
  "points": 5
}
```
- Like freetext but with a countdown timer
- `timeLimitSeconds`: Time limit in seconds (required for timed type)
- `points`: Maximum points possible (default: 1)

## Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Test name displayed to candidates |
| `description` | string | No | Brief description of what the test measures |
| `category` | string | No | Categorization (e.g., "Cognitive", "Technical", "Verbal") |
| `tags` | array | No | Array of tag strings for categorization (replaces category) |
| `durationMinutes` | number | No | Estimated total time for the test |
| `questions` | array | Yes | Array of question objects |
| `questions[].type` | string | Yes | One of: `mcq`, `freetext`, `timed` |
| `questions[].content` | string | Yes | The question or prompt text |
| `questions[].options` | array | MCQ only (required) | Answer choices: string array OR object array with text/points |
| `questions[].correctAnswer` | number | MCQ only (required) | Zero-based index of correct/best option (0, 1, 2, etc.) |
| `questions[].timeLimitSeconds` | number | Timed only (required) | Time limit in seconds |
| `questions[].points` | number | No | Points for this question (default: 1) |

## Flexible Points Use Cases

The flexible points format enables sophisticated scoring scenarios:

**1. Partial Credit**
Award partial points for answers that are partially correct:
```json
{
  "type": "mcq",
  "content": "What is the capital of France?",
  "options": [
    {"text": "Paris", "points": 10},
    {"text": "Lyon (major city, not capital)", "points": 3},
    {"text": "Berlin", "points": 0},
    {"text": "Madrid", "points": 0}
  ],
  "correctAnswer": 0,
  "points": 10
}
```

**2. Quality Levels**
Differentiate between good and excellent answers:
```json
{
  "type": "mcq",
  "content": "Which best describes photosynthesis?",
  "options": [
    {"text": "Complete technical definition", "points": 10},
    {"text": "Good definition with key concepts", "points": 7},
    {"text": "Basic understanding", "points": 4},
    {"text": "Incorrect definition", "points": 0}
  ],
  "correctAnswer": 0,
  "points": 10
}
```

**3. Risk Assessment**
Allow candidates to indicate confidence with point multipliers:
```json
{
  "type": "mcq",
  "content": "How confident are you in your previous answer?",
  "options": [
    {"text": "Very confident (2x multiplier)", "points": 20},
    {"text": "Confident (1x)", "points": 10},
    {"text": "Uncertain (0.5x)", "points": 5},
    {"text": "Guessing (0.2x)", "points": 2}
  ],
  "correctAnswer": 0,
  "points": 20
}
```

## Best Practices

1. **Balanced Question Types**: Mix MCQ for objective scoring with freetext for deeper assessment
2. **Clear Instructions**: Write unambiguous question content
3. **Appropriate Timing**: Set reasonable time limits for timed questions (60-180 seconds typical)
4. **Point Weighting**: Assign higher points to more complex questions
5. **Progressive Difficulty**: Consider ordering questions from easier to harder
6. **Flexible Points**: Use the object format for options when partial credit makes sense

## Example Categories
- Cognitive / Analytical
- Verbal Reasoning
- Numerical Reasoning
- Problem Solving
- Technical Skills
- Situational Judgment
- Creativity Assessment

## Sample Prompt for AI Generation

Use this prompt with an LLM to generate tests:

```
Generate a cognitive assessment test in JSON format following this structure:
- Title, description, and tags array fields
- Mix of question types: mcq (multiple choice), freetext (open-ended), timed (time-limited tasks)
- For MCQ: options can be simple string array OR object array with text/points for flexible scoring
- For MCQ: include correctAnswer (0-based index)
- For timed: include timeLimitSeconds
- Assign appropriate points based on difficulty

Use flexible points format (objects with text and points) when:
- Partial credit makes sense (e.g., partially correct answers)
- Multiple quality levels exist (excellent vs good vs partial)
- Risk/confidence assessment is appropriate

The test should assess [SKILL/TOPIC] for [JOB ROLE] candidates.
Include [NUMBER] questions covering [SPECIFIC AREAS].

Output valid JSON only.
```

## Download Sample
[Download sample-test.json](/sample-test.json)
