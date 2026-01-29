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
      // Return static list if no API key configured
      return NextResponse.json({
        models: [
          {
            value: 'gemini-1.5-flash-latest',
            label: 'Gemini 1.5 Flash',
            description: 'Recommended - Best balance of speed and quality',
            category: 'recommended',
          },
        ],
        count: 1,
      });
    }

    // Fetch available models from Gemini API
    const genai = new GoogleGenAI({ apiKey });
    const modelsPager = await genai.models.list();

    const allModels: any[] = [];
    for await (const model of modelsPager) {
      allModels.push(model);
    }

    // Filter and format models that support generateContent
    const formattedModels = allModels
      .filter((model) => {
        // Filter for models that support content generation
        const name = model.name || '';
        return name.includes('gemini') && !name.includes('vision') && !name.includes('embedding');
      })
      .map((model) => {
        const name = model.name || '';
        const displayName = model.displayName || name;

        // Extract just the model name (remove 'models/' prefix if present)
        const value = name.startsWith('models/') ? name.substring(7) : name;

        return {
          value,
          label: displayName,
          description: model.description || '',
          category: value.includes('flash') ? 'recommended' : 'quality',
        };
      })
      .sort((a, b) => {
        // Sort: recommended first, then by name
        if (a.category === 'recommended' && b.category !== 'recommended') return -1;
        if (a.category !== 'recommended' && b.category === 'recommended') return 1;
        return a.label.localeCompare(b.label);
      });

    return NextResponse.json({
      models: formattedModels,
      count: formattedModels.length,
      raw: allModels.map((m) => ({ name: m.name, displayName: m.displayName })), // For debugging
    });
  } catch (error: any) {
    console.error('Error fetching Gemini models:', error);

    // Return static fallback list on error
    return NextResponse.json({
      models: [
        {
          value: 'gemini-1.5-flash-latest',
          label: 'Gemini 1.5 Flash',
          description: 'Recommended - Best balance of speed and quality',
          category: 'recommended',
        },
        {
          value: 'gemini-1.5-pro-latest',
          label: 'Gemini 1.5 Pro',
          description: 'Highest quality for complex reasoning',
          category: 'quality',
        },
      ],
      count: 2,
      error: error?.message || 'Failed to fetch models from API',
    });
  }
}
