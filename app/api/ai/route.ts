import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GEMINI_MODEL = 'gemini-2.5-flash';

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  const accessToken = authorization?.replace(/^Bearer\s+/i, '');

  if (!accessToken) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 500 });
  }
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured.' }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Your session has expired. Please sign in again.' }, { status: 401 });
  }

  let body: { action?: string; payload?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid AI request.' }, { status: 400 });
  }

  const action = body.action;
  const payload = body.payload || {};
  if (!['summary', 'quiz', 'answer', 'flashcards', 'explain'].includes(action || '')) {
    return NextResponse.json({ error: 'Unsupported AI action.' }, { status: 400 });
  }

  const prompts: Record<string, string> = {
    summary: `Summarize this pharmacy study material clearly. Return JSON with "summary" and "keyPoints" array.\n\nContext: ${payload.context || ''}\n\nText:\n${payload.text || ''}`,
    quiz: `Create ${payload.questionCount || 5} ${payload.difficulty || 'medium'} difficulty ${payload.questionType || 'mcq'} quiz questions from this material. Return JSON with a "questions" array. Each item has question, type, options, correctAnswer, and explanation.\n\nText:\n${payload.text || ''}`,
    answer: `Answer this pharmacy study question clearly and accurately. Return JSON with "explanation" and "sources" array.\n\nQuestion: ${payload.question || ''}\n\nSources: ${JSON.stringify(payload.sources || [])}`,
  };
  const prompt = prompts[action || ''];

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    },
  );

  if (!geminiResponse.ok) {
    await geminiResponse.text();
    return NextResponse.json(
      { error: `Gemini ${GEMINI_MODEL} request failed (${geminiResponse.status}).` },
      { status: 502 },
    );
  }

  const geminiData = await geminiResponse.json();
  const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return NextResponse.json({ error: 'Gemini returned an empty response.' }, { status: 502 });
  }

  try {
    const parsed = JSON.parse(text);
    if (action === 'summary') return NextResponse.json(parsed);
    if (action === 'quiz') return NextResponse.json(parsed);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({
      explanation: text,
      sources: [],
    });
  }
}
