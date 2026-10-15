import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getVisionConfig } from '@/lib/vision/engine';

export async function GET() {
  try {
    const config = await getVisionConfig();

    // Mask keys for safety
    const maskKey = (key: string) => {
      if (!key) return '';
      if (key.length <= 8) return '********';
      return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
    };

    return NextResponse.json({
      success: true,
      data: {
        provider: config.provider,
        model: config.model,
        hasGeminiKey: Boolean(config.geminiKey),
        maskedGeminiKey: maskKey(config.geminiKey),
        hasOpenAiKey: Boolean(config.openaiKey),
        maskedOpenAiKey: maskKey(config.openaiKey),
        hasAnthropicKey: Boolean(config.anthropicKey),
        hasAnyKey: config.hasAnyKey,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { geminiApiKey, openaiApiKey, visionProvider, visionModel } = body;

    const dataToUpdate: any = {};
    if (geminiApiKey !== undefined) dataToUpdate.geminiApiKey = geminiApiKey.trim() || null;
    if (openaiApiKey !== undefined) dataToUpdate.openaiApiKey = openaiApiKey.trim() || null;
    if (visionProvider !== undefined) dataToUpdate.visionProvider = visionProvider;
    if (visionModel !== undefined) dataToUpdate.visionModel = visionModel;

    await db.businessSettings.upsert({
      where: { id: 'default' },
      update: dataToUpdate,
      create: {
        id: 'default',
        companyName: 'ASHIRWAD TECH',
        ...dataToUpdate,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'AI Vision settings saved successfully',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
