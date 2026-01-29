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

    // List available models
    const modelsPager = await genai.models.list();

    // Convert pager to array and filter for models that support generateContent
    const allModels: any[] = [];
    for await (const model of modelsPager) {
      allModels.push(model);
    }

    const contentModels = allModels.filter((model: any) => {
      const supportsGenerate = model.supportedGenerationMethods?.includes('generateContent');
      // Only include gemini models (exclude embedding models, etc.)
      const isGemini = model.name?.includes('gemini');
      return supportsGenerate && isGemini;
    });

    // Format model data
    const formattedModels = contentModels.map((model: any) => {
      const name = model.name?.replace('models/', '') || model.name;

      // Generate user-friendly label
      let label = name;
      let description = '';
      let category = 'other';

      if (name.includes('gemini-1.5-flash-8b')) {
        label = 'Gemini 1.5 Flash-8B';
        description = 'Fastest and most cost-effective';
        category = 'fast';
      } else if (name.includes('gemini-1.5-flash')) {
        label = 'Gemini 1.5 Flash';
        description = 'Recommended - Best balance of speed and quality';
        category = 'recommended';
      } else if (name.includes('gemini-1.5-pro')) {
        label = 'Gemini 1.5 Pro';
        description = 'Highest quality for complex reasoning';
        category = 'quality';
      } else if (name.includes('gemini-2.0')) {
        label = name.replace('gemini-2.0-', 'Gemini 2.0 ')
          .split('-')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        description = 'Latest experimental version';
        category = 'experimental';
      } else if (name.includes('gemini-pro')) {
        label = 'Gemini Pro';
        description = 'Production model';
        category = 'quality';
      }

      return {
        value: name,
        label,
        description,
        category,
        displayName: model.displayName || label,
        inputTokenLimit: model.inputTokenLimit,
        outputTokenLimit: model.outputTokenLimit,
      };
    });

    // Sort models: recommended first, then by category
    const sortOrder = { recommended: 0, fast: 1, quality: 2, experimental: 3, other: 4 };
    formattedModels.sort((a: any, b: any) => {
      return sortOrder[a.category as keyof typeof sortOrder] - sortOrder[b.category as keyof typeof sortOrder];
    });

    return NextResponse.json({
      models: formattedModels,
      count: formattedModels.length,
    });
  } catch (error) {
    console.error('Error fetching Gemini models:', error);

    // Return fallback models if API call fails
    return NextResponse.json({
      models: [
        {
          value: 'gemini-1.5-flash',
          label: 'Gemini 1.5 Flash',
          description: 'Recommended - Best balance of speed and quality',
          category: 'recommended',
        },
        {
          value: 'gemini-1.5-flash-8b',
          label: 'Gemini 1.5 Flash-8B',
          description: 'Fastest and most cost-effective',
          category: 'fast',
        },
        {
          value: 'gemini-1.5-pro',
          label: 'Gemini 1.5 Pro',
          description: 'Highest quality for complex reasoning',
          category: 'quality',
        },
      ],
      count: 3,
      error: 'Failed to fetch live models, showing fallback list',
    });
  }
}
