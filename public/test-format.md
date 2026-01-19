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
- `correctAnswer`: Zero-based index of the correct option (0 = first option)
- `points`: Points awarded for correct answer (default: 1)

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
| `durationMinutes` | number | No | Estimated total time for the test |
| `questions` | array | Yes | Array of question objects |
| `questions[].type` | string | Yes | One of: `mcq`, `freetext`, `timed` |
| `questions[].content` | string | Yes | The question or prompt text |
| `questions[].options` | array | MCQ only | Answer choices for multiple choice |
| `questions[].correctAnswer` | number | MCQ only | Zero-based index of correct option |
| `questions[].timeLimitSeconds` | number | Timed only | Time limit in seconds |
| `questions[].points` | number | No | Points for this question (default: 1) |

## Best Practices

1. **Balanced Question Types**: Mix MCQ for objective scoring with freetext for deeper assessment
2. **Clear Instructions**: Write unambiguous question content
3. **Appropriate Timing**: Set reasonable time limits for timed questions (60-180 seconds typical)
4. **Point Weighting**: Assign higher points to more complex questions
5. **Progressive Difficulty**: Consider ordering questions from easier to harder

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
- Title, description, and category fields
- Mix of question types: mcq (multiple choice), freetext (open-ended), timed (time-limited tasks)
- For MCQ: include options array and correctAnswer (0-based index)
- For timed: include timeLimitSeconds
- Assign appropriate points based on difficulty

The test should assess [SKILL/TOPIC] for [JOB ROLE] candidates.
Include [NUMBER] questions covering [SPECIFIC AREAS].

Output valid JSON only.
```

## Download Sample
[Download sample-test.json](/sample-test.json)
