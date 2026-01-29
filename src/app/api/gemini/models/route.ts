import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Return curated list of Gemini models
  // These are the stable, production-ready models as of Jan 2025
  const models = [
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
    {
      value: 'gemini-2.0-flash-exp',
      label: 'Gemini 2.0 Flash (Experimental)',
      description: 'Latest experimental features - may be unstable',
      category: 'experimental',
    },
    {
      value: 'gemini-exp-1206',
      label: 'Gemini Experimental 1206',
      description: 'Experimental model with advanced capabilities',
      category: 'experimental',
    },
  ];

  return NextResponse.json({
    models,
    count: models.length,
  });
}
