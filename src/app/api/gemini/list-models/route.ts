import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get API key from database or environment
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
        { error: 'Gemini API key not configured' },
        { status: 400 }
      );
    }

    // Initialize Gemini
    const genai = new GoogleGenAI({ apiKey });

    // List all available models
    const modelsPager = await genai.models.list();

    // Convert pager to array
    const allModels: any[] = [];
    for await (const model of modelsPager) {
      // Only include models that support generateContent
      const modelData: any = {
        name: model.name,
        displayName: model.displayName,
        description: model.description,
      };

      // Try to access optional properties safely
      if ('inputTokenLimit' in model) modelData.inputTokenLimit = (model as any).inputTokenLimit;
      if ('outputTokenLimit' in model) modelData.outputTokenLimit = (model as any).outputTokenLimit;

      allModels.push(modelData);
    }

    return NextResponse.json({
      models: allModels,
      count: allModels.length,
    });
  } catch (error: any) {
    console.error('Error listing Gemini models:', error);
    return NextResponse.json(
      {
        error: 'Failed to list models',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
