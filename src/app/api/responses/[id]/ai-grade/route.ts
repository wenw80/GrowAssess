import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import prisma from '@/lib/db';
import { parseTestSnapshot } from '@/lib/testSnapshot';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch the response with all necessary context
    const response = await prisma.response.findUnique({
      where: { id },
      include: {
        assignment: {
          select: {
            testSnapshot: true,
            candidate: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!response) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 });
    }

    // Get question from snapshot
    const snapshot = parseTestSnapshot(response.assignment.testSnapshot);
    const question = snapshot.questions.find((q) => q.id === response.questionId);

    if (!question) {
      return NextResponse.json({ error: 'Question not found in snapshot' }, { status: 404 });
    }

    // Only grade freetext and timed questions
    if (question.type !== 'freetext' && question.type !== 'timed') {
      return NextResponse.json(
        { error: 'AI grading is only available for freetext and timed questions' },
        { status: 400 }
      );
    }

    if (!response.answer || response.answer.trim().length === 0) {
      return NextResponse.json(
        { error: 'No answer provided to grade' },
        { status: 400 }
      );
    }

    // Get API key (from database first, then environment)
    let apiKey: string | undefined;
    try {
      const setting = await prisma.setting.findUnique({
        where: { key: 'gemini_api_key' },
      });
      apiKey = setting?.value;
    } catch (error) {
      console.error('Error fetching API key from database:', error);
    }

    if (!apiKey) {
      apiKey = process.env.GEMINI_API_KEY;
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured. Please set it in Settings.' },
        { status: 500 }
      );
    }

    // Initialize Gemini
    const genai = new GoogleGenAI({ apiKey });

    // Build the grading prompt
    const systemPrompt = `You are an experienced HR interviewer and assessment grader. Your task is to evaluate a candidate's response to a test question.

Context:
- Test Purpose/Requirements: ${snapshot.requirements || 'General assessment'}
- Test Title: ${snapshot.title}
- Question Type: ${question.type}
- Question: ${question.content}
- Maximum Points: ${question.points}
- Candidate Name: ${response.assignment.candidate.name}
- Candidate Answer: ${response.answer}

Your evaluation should provide:
1. **Suggested Score** (0-${question.points}): A numerical score based on the quality, completeness, and relevance of the answer.
2. **Strengths**: What the candidate did well in their response (be specific).
3. **Weaknesses**: What was missing, unclear, or could be improved (be specific).
4. **Fit Analysis**: Brief assessment of the candidate's fit for the role based on this response and the test requirements.

Return your evaluation in the following JSON format:
{
  "suggestedScore": <number between 0 and ${question.points}>,
  "strengths": "<bullet points or short paragraphs>",
  "weaknesses": "<bullet points or short paragraphs>",
  "fitAnalysis": "<2-3 sentences about candidate fit>"
}

Be objective, constructive, and fair in your evaluation. Consider:
- How well the answer addresses the question
- Depth and quality of reasoning
- Relevance to the test requirements
- Communication clarity
- Demonstrated competencies

IMPORTANT: Return ONLY valid JSON. No markdown, no code blocks, no explanations outside the JSON.`;

    // Call Gemini API
    const aiResponse = await genai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }],
        },
      ],
      config: {
        temperature: 0.5,
        maxOutputTokens: 2048,
      },
    });

    // Extract the generated text
    const generatedText = aiResponse.text || '';

    if (!generatedText) {
      return NextResponse.json(
        { error: 'No response from AI model' },
        { status: 500 }
      );
    }

    // Parse JSON response
    let gradeData;
    try {
      const cleanedText = generatedText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      gradeData = JSON.parse(cleanedText);
    } catch (parseError) {
      return NextResponse.json(
        {
          error: 'Failed to parse AI response',
          details: generatedText.substring(0, 500),
        },
        { status: 500 }
      );
    }

    // Validate the structure
    if (
      typeof gradeData.suggestedScore !== 'number' ||
      !gradeData.strengths ||
      !gradeData.weaknesses ||
      !gradeData.fitAnalysis
    ) {
      return NextResponse.json(
        {
          error: 'Invalid AI response structure',
          data: gradeData,
        },
        { status: 500 }
      );
    }

    // Ensure score is within bounds
    gradeData.suggestedScore = Math.max(
      0,
      Math.min(question.points, Math.round(gradeData.suggestedScore))
    );

    return NextResponse.json({
      success: true,
      grade: gradeData,
    });
  } catch (error) {
    console.error('Error generating AI grade:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate AI grade',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
