import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callGemini, requireUser, checkRateLimit } from '@/lib/gemini';

export const maxDuration = 60;

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(4000),
});

const InputSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  context: z.string().max(8000).optional(),
  history: z.array(MessageSchema).max(20).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!(await checkRateLimit(auth.userId))) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before asking another question.' },
        { status: 429 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request' }, { status: 400 });
    }

    const parsed = InputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Message is required and must be 4000 characters or fewer' },
        { status: 400 },
      );
    }

    const { message, context, history = [] } = parsed.data;
    const conversation = history
      .slice(-12)
      .map((item) => `${item.role === 'assistant' ? 'Assistant' : 'Student'}: ${item.content}`)
      .join('\n');

    const prompt = `You are PharmaHub AI, a careful pharmacy and healthcare education assistant.
Support learning, explain concepts accurately, and distinguish evidence from uncertainty.
Do not provide a diagnosis or prescribe individual treatment. Encourage professional verification for patient-specific decisions.

${context ? `Relevant study context:\n<context>\n${context}\n</context>\n` : ''}
${conversation ? `Recent conversation:\n${conversation}\n` : ''}
Student: ${message}
Assistant:`;

    const reply = await callGemini({
      prompt,
      temperature: 0.4,
      maxOutputTokens: 2048,
    });

    return NextResponse.json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI request failed';
    console.error('Chat API error:', message);

    if (message.includes('not configured')) {
      return NextResponse.json({ error: 'The AI service is not configured.' }, { status: 503 });
    }
    if (message.includes('authentication')) {
      return NextResponse.json({ error: 'The AI service credentials are invalid.' }, { status: 502 });
    }
    if (message.includes('quota') || message.includes('rate limit')) {
      return NextResponse.json({ error: 'The AI service is temporarily rate-limited. Please retry.' }, { status: 429 });
    }
    return NextResponse.json({ error: 'The AI service could not complete this request.' }, { status: 502 });
  }
}
