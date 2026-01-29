import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  const logs: string[] = [];
  const results: any = {
    success: false,
    steps: [],
    workingModel: null,
  };

  try {
    const { apiKey: providedApiKey } = await request.json();

    logs.push('=== STEP 1: API Key Authentication ===');

    // Get API key
    let apiKey: string | undefined = providedApiKey;

    if (!apiKey) {
      logs.push('No API key provided in request, checking database...');
      try {
        const setting = await prisma.setting.findUnique({
          where: { key: 'gemini_api_key' },
        });
        apiKey = setting?.value;
        if (apiKey) {
          logs.push('✓ API key found in database');
        } else {
          logs.push('✗ No API key in database');
        }
      } catch (error) {
        logs.push(`✗ Database error: ${error}`);
      }
    } else {
      logs.push('✓ API key provided in request');
    }

    if (!apiKey) {
      apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        logs.push('✓ API key found in environment variables');
      } else {
        logs.push('✗ No API key in environment variables');
      }
    }

    if (!apiKey) {
      results.steps = logs;
      return NextResponse.json({
        ...results,
        error: 'No API key found',
      });
    }

    logs.push(`API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
    logs.push('');

    // Initialize SDK
    logs.push('=== STEP 2: Initialize Google GenAI SDK ===');
    const genai = new GoogleGenAI({ apiKey });
    logs.push('✓ SDK initialized successfully');
    logs.push('');

    // List models
    logs.push('=== STEP 3: List Available Models ===');
    logs.push('Calling genai.models.list()...');

    const modelsPager = await genai.models.list();
    logs.push('✓ Models list received');
    logs.push('');

    const allModels: any[] = [];
    logs.push('Iterating through models...');
    let count = 0;
    for await (const model of modelsPager) {
      count++;
      allModels.push(model);
      logs.push(`  [${count}] Name: ${model.name || 'undefined'}`);
      logs.push(`      Display: ${model.displayName || 'undefined'}`);
      logs.push(`      Description: ${(model.description || '').substring(0, 60)}...`);
      logs.push('');
    }

    logs.push(`✓ Total models found: ${allModels.length}`);
    logs.push('');

    // Filter for Gemini models
    logs.push('=== STEP 4: Filter Gemini Models ===');
    const geminiModels = allModels.filter((model) => {
      const name = (model.name || '').toLowerCase();
      return name.includes('gemini');
    });

    logs.push(`Found ${geminiModels.length} Gemini models:`);
    geminiModels.forEach((model, idx) => {
      logs.push(`  [${idx + 1}] ${model.name}`);
    });
    logs.push('');

    if (geminiModels.length === 0) {
      results.steps = logs;
      return NextResponse.json({
        ...results,
        error: 'No Gemini models found',
        allModels: allModels.map(m => ({ name: m.name, displayName: m.displayName })),
      });
    }

    // Test different model name formats
    logs.push('=== STEP 5: Test Model Name Formats ===');
    logs.push('Testing generateContent with different name formats...');
    logs.push('');

    const testPrompt = 'Say "Hello" in one word.';
    let workingModel = null;

    for (const model of geminiModels.slice(0, 3)) { // Test first 3 models only
      const originalName = model.name;

      // Test with original name
      logs.push(`--- Testing: ${originalName} ---`);
      try {
        const response = await genai.models.generateContent({
          model: originalName,
          contents: [{ role: 'user', parts: [{ text: testPrompt }] }],
          config: { temperature: 0.1, maxOutputTokens: 10 },
        });

        const text = response.text || '';
        logs.push(`✓ SUCCESS with "${originalName}"`);
        logs.push(`  Response: ${text.substring(0, 50)}`);
        workingModel = originalName;
        logs.push('');
        break; // Found working model
      } catch (error: any) {
        logs.push(`✗ FAILED with "${originalName}"`);
        logs.push(`  Error: ${error?.message || error}`);
      }

      // Test without "models/" prefix
      if (originalName.startsWith('models/')) {
        const nameWithoutPrefix = originalName.substring(7);
        logs.push(`  Trying without prefix: ${nameWithoutPrefix}`);

        try {
          const response = await genai.models.generateContent({
            model: nameWithoutPrefix,
            contents: [{ role: 'user', parts: [{ text: testPrompt }] }],
            config: { temperature: 0.1, maxOutputTokens: 10 },
          });

          const text = response.text || '';
          logs.push(`✓ SUCCESS with "${nameWithoutPrefix}"`);
          logs.push(`  Response: ${text.substring(0, 50)}`);
          workingModel = nameWithoutPrefix;
          logs.push('');
          break; // Found working model
        } catch (error: any) {
          logs.push(`✗ FAILED with "${nameWithoutPrefix}"`);
          logs.push(`  Error: ${error?.message || error}`);
        }
      }

      // Test with "models/" prefix added
      if (!originalName.startsWith('models/')) {
        const nameWithPrefix = `models/${originalName}`;
        logs.push(`  Trying with prefix: ${nameWithPrefix}`);

        try {
          const response = await genai.models.generateContent({
            model: nameWithPrefix,
            contents: [{ role: 'user', parts: [{ text: testPrompt }] }],
            config: { temperature: 0.1, maxOutputTokens: 10 },
          });

          const text = response.text || '';
          logs.push(`✓ SUCCESS with "${nameWithPrefix}"`);
          logs.push(`  Response: ${text.substring(0, 50)}`);
          workingModel = nameWithPrefix;
          logs.push('');
          break; // Found working model
        } catch (error: any) {
          logs.push(`✗ FAILED with "${nameWithPrefix}"`);
          logs.push(`  Error: ${error?.message || error}`);
        }
      }

      logs.push('');
    }

    logs.push('=== SUMMARY ===');
    if (workingModel) {
      logs.push(`✓ WORKING MODEL FOUND: ${workingModel}`);
      results.success = true;
      results.workingModel = workingModel;
    } else {
      logs.push('✗ No working model found');
    }

    results.steps = logs;
    results.availableModels = geminiModels.map(m => ({
      name: m.name,
      displayName: m.displayName,
      description: m.description,
    }));

    return NextResponse.json(results);

  } catch (error: any) {
    logs.push('');
    logs.push('=== FATAL ERROR ===');
    logs.push(`✗ ${error?.message || error}`);
    logs.push(`Stack: ${error?.stack || 'No stack trace'}`);

    results.steps = logs;
    return NextResponse.json({
      ...results,
      error: error?.message || 'Unknown error',
      stack: error?.stack,
    }, { status: 500 });
  }
}
