import { NextRequest, NextResponse } from 'next/server';

const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface QuizQuestion {
  question: string;
  type: 'mcq' | 'true_false' | 'short_answer';
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export async function POST(req: NextRequest) {
  try {
    const { text, questionCount, difficulty, questionType, topic } = await req.json();

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI API key not configured' },
        { status: 500 }
      );
    }

    const typeInstruction =
      questionType === 'mcq'
        ? 'multiple choice questions with 4 options each'
        : questionType === 'true_false'
          ? 'true/false questions'
          : questionType === 'short_answer'
            ? 'short answer questions'
            : 'a mix of multiple choice, true/false, and short answer questions';

    const prompt = `You are a pharmacy educator creating a quiz for pharmacy students.
Generate ${questionCount} ${difficulty} level ${typeInstruction} about ${topic || 'general pharmacy topics'}.
${text ? `Base the questions on this study material:\n${text.slice(0, 8000)}` : 'Use your knowledge of pharmacy topics.'}

Return ONLY a JSON array (no markdown, no code fences) where each item has this shape:
{
  "question": "the question text",
  "type": "mcq" | "true_false" | "short_answer",
  "options": ["A", "B", "C", "D"] (for mcq and true_false, omit for short_answer),
  "correctAnswer": "the correct option text",
  "explanation": "brief explanation of why this is correct"
}

Make sure questions are clinically relevant and accurate for pharmacy education.`;

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', errText);
      return NextResponse.json(
        { error: 'AI generation failed' },
        { status: 502 }
      );
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let questions: QuizQuestion[] = [];
    try {
      const parsed = JSON.parse(rawText);
      questions = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      }
    }

    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'No questions generated' },
        { status: 500 }
      );
    }

    return NextResponse.json({ questions });
  } catch (err) {
    console.error('Quiz generation error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
