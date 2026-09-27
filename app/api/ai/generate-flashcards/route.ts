import { NextRequest, NextResponse } from 'next/server';

const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function POST(req: NextRequest) {
  try {
    const { text, count } = await req.json();

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI API key not configured' }, { status: 500 });
    }

    const prompt = `You are a pharmacy educator. Generate ${count || 10} flashcards from the following study material.
Each flashcard should have a question on the front and an answer on the back.

Return ONLY a JSON array (no markdown) with this shape:
[
  { "front": "question text", "back": "answer text" }
]

Study material:
${(text || '').slice(0, 8000)}`;

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'AI generation failed' }, { status: 502 });
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let cards;
    try {
      cards = JSON.parse(rawText);
    } catch {
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (jsonMatch) cards = JSON.parse(jsonMatch[0]);
    }

    if (!cards || !Array.isArray(cards)) {
      return NextResponse.json({ error: 'No flashcards generated' }, { status: 500 });
    }

    return NextResponse.json({ flashcards: cards });
  } catch (err) {
    console.error('Flashcard generation error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
