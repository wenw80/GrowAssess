import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Try to get API key and model from database first, then fall back to environment variable
    let apiKey: string | undefined;
    let modelName: string | undefined;
    try {
      const [apiKeySetting, modelSetting] = await Promise.all([
        prisma.setting.findUnique({ where: { key: 'gemini_api_key' } }),
        prisma.setting.findUnique({ where: { key: 'gemini_model' } }),
      ]);
      apiKey = apiKeySetting?.value;
      modelName = modelSetting?.value;
    } catch (error) {
      console.error('Error fetching settings from database:', error);
    }

    // Fall back to environment variable if not in database
    if (!apiKey) {
      apiKey = process.env.GEMINI_API_KEY;
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured. Please set it in Settings or add GEMINI_API_KEY to environment variables.' },
        { status: 500 }
      );
    }

    if (!modelName) {
      return NextResponse.json(
        { error: 'Gemini model not configured. Please run the debug tool in Settings to find a working model.' },
        { status: 500 }
      );
    }

    // Initialize Gemini
    const genai = new GoogleGenAI({ apiKey });

    // System prompt that defines the JSON format
    const systemPrompt = `You are a cognitive assessment test generator. Generate a valid JSON test following this exact structure:

{
  "title": "string (required)",
  "description": "string (optional)",
  "category": "string (optional)",
  "durationMinutes": number (optional),
  "questions": [
    {
      "type": "mcq",
      "content": "question text",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "points": 1
    },
    {
      "type": "freetext",
      "content": "question text",
      "points": 5
    },
    {
      "type": "timed",
      "content": "task description",
      "timeLimitSeconds": 120,
      "points": 5
    }
  ]
}

Question types:
- mcq: Multiple choice with options array and correctAnswer (0-based index)
- freetext: Open-ended response
- timed: Time-limited task with timeLimitSeconds

Best practices:
- Mix different question types for comprehensive assessment
- Use clear, unambiguous question content
- Set reasonable time limits (60-180 seconds for timed questions)
- Assign higher points to more complex questions
- Order questions from easier to harder

Categories: Cognitive, Analytical, Verbal Reasoning, Numerical Reasoning, Problem Solving, Technical Skills, Situational Judgment, Creativity Assessment

IMPORTANT: Return ONLY valid JSON. No markdown, no code blocks, no explanations. Just the raw JSON object.`;

    // Call Gemini API
    const response = await genai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            { text: `\n\nUser request: ${prompt}` }
          ]
        }
      ],
      config: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      }
    });

    // Extract the generated text
    const generatedText = response.text || '';

    if (!generatedText) {
      return NextResponse.json(
        { error: 'No response from AI model' },
        { status: 500 }
      );
    }

    // Try to parse JSON from the response
    let testJson;
    try {
      // Remove markdown code blocks if present
      const cleanedText = generatedText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      testJson = JSON.parse(cleanedText);
    } catch (parseError) {
      return NextResponse.json(
        {
          error: 'Failed to parse AI response as JSON',
          details: generatedText.substring(0, 500)
        },
        { status: 500 }
      );
    }

    // Validate the basic structure
    if (!testJson.title || !Array.isArray(testJson.questions) || testJson.questions.length === 0) {
      return NextResponse.json(
        {
          error: 'Generated test is missing required fields (title or questions)',
          test: testJson
        },
        { status: 500 }
      );
    }

    // Return the generated test
    return NextResponse.json({
      success: true,
      test: testJson,
      message: `Generated test with ${testJson.questions.length} questions`
    });

  } catch (error) {
    console.error('Error generating test:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate test',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
