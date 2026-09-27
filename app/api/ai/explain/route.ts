import { NextRequest, NextResponse } from 'next/server';

const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function POST(req: NextRequest) {
  try {
    const { concept, context } = await req.json();

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI API key not configured' }, { status: 500 });
    }

    const prompt = `You are a pharmacy educator. Explain the following concept clearly for a pharmacy student.
${context ? `Context: ${context}` : ''}

Return ONLY JSON (no markdown) with this shape:
{
  "explanation": "clear, detailed explanation",
  "sources": [{ "title": "topic area", "snippet": "brief relevant snippet" }]
}

Concept to explain: ${concept}`;

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
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
      return NextResponse.json({ error: 'No explanation generated' }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Explanation error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
