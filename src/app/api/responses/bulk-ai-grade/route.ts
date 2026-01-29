import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import prisma from '@/lib/db';
import { parseTestSnapshot } from '@/lib/testSnapshot';

export async function POST(request: NextRequest) {
  try {
    const { assignmentId } = await request.json();

    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID required' }, { status: 400 });
    }

    // Fetch the assignment with all responses
    const assignment = await prisma.testAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        candidate: {
          select: {
            name: true,
            email: true,
          },
        },
        responses: true,
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Get questions from snapshot
    const snapshot = parseTestSnapshot(assignment.testSnapshot);

    // Get API key and model
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

    if (!apiKey) {
      apiKey = process.env.GEMINI_API_KEY;
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured. Please set it in Settings.' },
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

    // Filter for freetext and timed questions with answers
    const gradableResponses = assignment.responses.filter((response) => {
      const question = snapshot.questions.find((q) => q.id === response.questionId);
      return (
        question &&
        (question.type === 'freetext' || question.type === 'timed') &&
        response.answer &&
        response.answer.trim().length > 0
      );
    });

    if (gradableResponses.length === 0) {
      return NextResponse.json({
        success: true,
        grades: [],
        message: 'No gradable responses found',
      });
    }

    // Generate AI grades for all gradable responses
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const response of gradableResponses) {
      const question = snapshot.questions.find((q) => q.id === response.questionId);
      if (!question) continue;

      try {
        // Build the grading prompt
        const systemPrompt = `You are an experienced HR interviewer and assessment grader. Your task is to evaluate a candidate's response to a test question.

Context:
- Test Purpose/Requirements: ${snapshot.requirements || 'General assessment'}
- Test Title: ${snapshot.title}
- Question Type: ${question.type}
- Question: ${question.content}
- Maximum Points: ${question.points}
- Candidate Name: ${assignment.candidate.name}
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
          model: modelName,
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

        const generatedText = aiResponse.text || '';

        if (!generatedText) {
          throw new Error('No response from AI model');
        }

        // Parse JSON response
        const cleanedText = generatedText
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();

        const gradeData = JSON.parse(cleanedText);

        // Validate the structure
        if (
          typeof gradeData.suggestedScore !== 'number' ||
          !gradeData.strengths ||
          !gradeData.weaknesses ||
          !gradeData.fitAnalysis
        ) {
          throw new Error('Invalid AI response structure');
        }

        // Ensure score is within bounds
        gradeData.suggestedScore = Math.max(
          0,
          Math.min(question.points, Math.round(gradeData.suggestedScore))
        );

        results.push({
          responseId: response.id,
          questionId: question.id,
          questionContent: question.content.substring(0, 100),
          success: true,
          grade: gradeData,
        });

        successCount++;
      } catch (error: any) {
        console.error(`Error grading response ${response.id}:`, error);
        results.push({
          responseId: response.id,
          questionId: question.id,
          questionContent: question.content.substring(0, 100),
          success: false,
          error: error?.message || 'Unknown error',
        });
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: gradableResponses.length,
        successful: successCount,
        failed: errorCount,
      },
    });
  } catch (error) {
    console.error('Error bulk generating AI grades:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate AI grades',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
