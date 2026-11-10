import { NextRequest } from 'next/server';
import { z } from 'zod';

const configuredModel = process.env.GEMINI_MODEL?.trim();
const GEMINI_MODEL = configuredModel && /^[a-zA-Z0-9._-]+$/.test(configuredModel)
  ? configuredModel
  : 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;

export async function checkRateLimit(userId: string): Promise<boolean> {
  const now = Date.now();
  const record = rateLimitMap.get(userId);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (record.count >= RATE_LIMIT_MAX) return false;
  record.count++;
  return true;
}

export async function requireUser(req: NextRequest): Promise<{ userId: string } | { error: string; status: number }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return { error: 'Missing or invalid authorization header', status: 401 };
  const token = authHeader.slice(7).trim();
  if (!token) return { error: 'Missing or invalid authorization header', status: 401 };

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '');
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    if (!supabaseUrl || !supabaseAnonKey) return { error: 'Authentication is temporarily unavailable. Please try again later.', status: 503 };
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnonKey },
    });
    if (!response.ok) return { error: 'Unauthorized', status: 401 };
    const userData: { id?: unknown } = await response.json();
    if (typeof userData.id !== 'string' || !userData.id) return { error: 'Unauthorized', status: 401 };
    return { userId: userData.id };
  } catch {
    return { error: 'Authentication failed. Please try again.', status: 401 };
  }
}

interface GeminiCallOptions {
  prompt: string;
  temperature: number;
  maxOutputTokens: number;
  responseMimeType?: string;
}

export async function callGemini(options: GeminiCallOptions): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY?.trim();
  if (!apiKey) throw new Error('AI features are not configured yet. Please contact your administrator.');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);
  try {
    const endpoint = new URL(GEMINI_ENDPOINT);
    endpoint.searchParams.set('key', apiKey);
    const response = await fetch(endpoint.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: options.prompt }] }],
        generationConfig: {
          temperature: options.temperature,
          maxOutputTokens: options.maxOutputTokens,
          responseMimeType: options.responseMimeType || 'text/plain',
        },
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403
      ? 'The AI provider rejected its configuration. Please contact your administrator.'
      : 'The AI service is temporarily unavailable. Please try again later.');

    const data: { candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }> } = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate) throw new Error('The AI service returned no response. Please try again.');
    if (candidate.finishReason === 'SAFETY') throw new Error('The AI response was blocked by its safety filter. Try rephrasing your request.');
    if (candidate.finishReason === 'MAX_TOKENS') throw new Error('The AI response was too long. Please try a shorter request.');
    const text = candidate.content?.parts?.[0]?.text;
    if (!text) throw new Error('The AI service returned an empty response. Please try again.');
    return text;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('The AI service is temporarily unavailable. Please try again later.');
  } finally {
    clearTimeout(timeoutId);
  }
}

export function parseJSON<T>(text: string, schema: z.ZodSchema): T | null {
  const candidates = [text, text.replace(/```json\n?|```\n?/g, '').trim()];
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (match) candidates.push(match[0]);
  for (const candidate of candidates) {
    try {
      return schema.parse(JSON.parse(candidate)) as T;
    } catch {
      // Continue trying sanitized response formats.
    }
  }
  return null;
}
