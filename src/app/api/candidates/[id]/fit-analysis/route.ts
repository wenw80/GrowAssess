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

    // Fetch the candidate with all necessary context
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            test: {
              select: {
                title: true,
                description: true,
                tags: true,
              },
            },
            responses: {
              include: {
                question: true,
              },
            },
          },
        },
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    // Check if there are any completed assessments
    const completedAssignments = candidate.assignments.filter(
      (a) => a.status === 'completed'
    );

    if (completedAssignments.length === 0) {
      return NextResponse.json(
        { error: 'No completed assessments to analyze' },
        { status: 400 }
      );
    }

    // Get API key and model from database or environment
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
        { error: 'Gemini model not configured. Please configure it in Settings.' },
        { status: 500 }
      );
    }

    // Build comprehensive assessment data
    const assessmentSummaries = completedAssignments.map((assignment) => {
      const snapshot = parseTestSnapshot(assignment.testSnapshot);

      // Calculate score
      const totalPoints = assignment.responses.reduce(
        (sum, r) => sum + (r.question?.points || 0),
        0
      );
      const earnedPoints = assignment.responses.reduce((sum, r) => {
        if (r.score !== null) return sum + r.score;
        if (r.isCorrect) return sum + (r.question?.points || 0);
        return sum;
      }, 0);
      const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

      // Gather responses with grader notes (AI feedback)
      const responseDetails = assignment.responses.map((r) => {
        const snapshotQuestion = snapshot.questions.find((q) => q.id === r.questionId);
        return {
          question: snapshotQuestion?.content || r.question?.content || 'Unknown question',
          type: snapshotQuestion?.type || r.question?.type || 'unknown',
          answer: r.answer || 'No answer provided',
          score: r.score,
          maxScore: snapshotQuestion?.points || r.question?.points || 0,
          isCorrect: r.isCorrect,
          graderNotes: r.graderNotes, // AI-generated feedback
        };
      });

      return {
        testTitle: snapshot.title || assignment.test.title,
        testDescription: snapshot.description || assignment.test.description,
        testTags: snapshot.tags || assignment.test.tags || [],
        requirements: snapshot.requirements,
        score: `${earnedPoints}/${totalPoints} (${percentage}%)`,
        completedAt: assignment.completedAt,
        responses: responseDetails,
      };
    });

    // Initialize Gemini
    const genai = new GoogleGenAI({ apiKey });

    // Build the analysis prompt
    const systemPrompt = `You are an experienced HR professional and talent acquisition specialist. Your task is to analyze a job candidate's fit based on their assessment results and the job they're applying for.

## Candidate Information
- **Name**: ${candidate.name}
- **Email**: ${candidate.email}
- **Position Applied**: ${candidate.position || 'Not specified'}
- **Current Status**: ${candidate.status}
${candidate.notes ? `- **Notes**: ${candidate.notes}` : ''}

## Job Description
${candidate.jobDescription || 'No job description provided. Please provide a general assessment based on the test results.'}

## Assessment Results
${assessmentSummaries.map((summary, idx) => `
### Assessment ${idx + 1}: ${summary.testTitle}
${summary.testDescription ? `**Description**: ${summary.testDescription}` : ''}
${summary.requirements ? `**Requirements/Purpose**: ${summary.requirements}` : ''}
**Tags/Categories**: ${summary.testTags.length > 0 ? summary.testTags.join(', ') : 'None'}
**Score**: ${summary.score}
**Completed**: ${summary.completedAt}

**Question Responses**:
${summary.responses.map((r, qIdx) => `
${qIdx + 1}. **Question** (${r.type}, ${r.maxScore} pts): ${r.question}
   **Answer**: ${r.answer}
   **Score**: ${r.score !== null ? `${r.score}/${r.maxScore}` : (r.isCorrect !== null ? (r.isCorrect ? 'Correct' : 'Incorrect') : 'Not graded')}
   ${r.graderNotes ? `**AI Feedback**: ${r.graderNotes}` : ''}
`).join('')}
`).join('\n')}

## Your Analysis Task
Based on all the information above, provide a comprehensive fit analysis. Consider:
1. How well the candidate's demonstrated skills match the job requirements
2. Strengths shown across all assessments
3. Areas of concern or weakness
4. Overall recommendation on candidate fit

Return your analysis in the following JSON format:
{
  "overallFitScore": <number 1-100 representing overall fit percentage>,
  "fitLevel": "<Strong Fit | Good Fit | Moderate Fit | Weak Fit | Not a Fit>",
  "summary": "<2-3 sentence executive summary of the candidate's fit>",
  "strengths": [
    "<strength 1>",
    "<strength 2>",
    "<strength 3>"
  ],
  "concerns": [
    "<concern 1>",
    "<concern 2>"
  ],
  "skillMatch": {
    "matched": ["<skill 1>", "<skill 2>"],
    "missing": ["<skill 1>", "<skill 2>"],
    "exceeded": ["<skill 1>"]
  },
  "recommendation": "<Highly Recommend | Recommend | Consider with Reservations | Do Not Recommend>",
  "detailedAnalysis": "<A paragraph providing deeper analysis of the candidate's fit, including specific examples from their responses that support your conclusions>",
  "interviewSuggestions": [
    "<Question or topic to explore in an interview>",
    "<Another area to probe>"
  ]
}

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
        temperature: 0.6,
        maxOutputTokens: 4096,
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
    let analysisData;
    try {
      const cleanedText = generatedText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      analysisData = JSON.parse(cleanedText);
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
      typeof analysisData.overallFitScore !== 'number' ||
      !analysisData.fitLevel ||
      !analysisData.summary ||
      !analysisData.recommendation
    ) {
      return NextResponse.json(
        {
          error: 'Invalid AI response structure',
          data: analysisData,
        },
        { status: 500 }
      );
    }

    // Ensure score is within bounds
    analysisData.overallFitScore = Math.max(
      0,
      Math.min(100, Math.round(analysisData.overallFitScore))
    );

    // Save the analysis to the database
    const now = new Date();
    await prisma.candidate.update({
      where: { id },
      data: {
        fitScore: analysisData.overallFitScore,
        fitLevel: analysisData.fitLevel,
        fitAnalysis: JSON.stringify(analysisData),
        fitAnalyzedAt: now,
      },
    });

    return NextResponse.json({
      success: true,
      analysis: analysisData,
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('Error generating fit analysis:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate fit analysis',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
