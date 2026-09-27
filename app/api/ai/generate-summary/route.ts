import { NextRequest, NextResponse } from 'next/server';

const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI API key not configured' }, { status: 500 });
    }

    const prompt = `You are a pharmacy educator. Summarize the following study material for a pharmacy student.
Provide a concise summary and 3-5 key points.

Return ONLY JSON (no markdown) with this shape:
{
  "summary": "2-3 paragraph summary",
  "keyPoints": ["point 1", "point 2", "point 3"]
}

Study material:
${(text || '').slice(0, 8000)}`;

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'AI generation failed' }, { status: 502 });
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let result;
    try {
      result = JSON.parse(rawText);
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) result = JSON.parse(jsonMatch[0]);
    }

    if (!result) {
      return NextResponse.json({ error: 'No summary generated' }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Summary generation error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
