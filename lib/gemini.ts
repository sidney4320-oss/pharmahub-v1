import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Simple in-memory rate limiter (per-instance, best effort)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute

export async function checkRateLimit(userId: string): Promise<boolean> {
  const now = Date.now();
  const record = rateLimitMap.get(userId);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

export async function requireUser(
  req: NextRequest
): Promise<{ userId: string } | { error: string; status: number }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing or invalid authorization header', status: 401 };
  }

  const token = authHeader.slice(7);

  try {
    // Validate token with Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return { error: 'Supabase not configured', status: 500 };
    }

    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
      },
    });

    if (!response.ok) {
      return { error: 'Unauthorized', status: 401 };
    }

    const userData = await response.json();
    return { userId: userData.id };
  } catch (error) {
    console.error('Auth error:', error);
    return { error: 'Authentication failed', status: 401 };
  }
}

interface GeminiCallOptions {
  prompt: string;
  temperature: number;
  maxOutputTokens: number;
  responseMimeType?: string;
}

export async function callGemini(options: GeminiCallOptions): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
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

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API returned ${response.status}`);
    }

    const data = await response.json();

    // Check for safety/completion issues
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No candidates in Gemini response');
    }

    const candidate = data.candidates[0];
    if (candidate.finishReason === 'SAFETY') {
      throw new Error('Response blocked by safety filter');
    }
    if (candidate.finishReason === 'MAX_TOKENS') {
      throw new Error('Response exceeded max tokens');
    }

    const text = candidate.content?.parts?.[0]?.text || '';
    if (!text) {
      throw new Error('No text content in Gemini response');
    }

    return text;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error calling Gemini');
  }
}

export function parseJSON<T>(
  text: string,
  schema: z.ZodSchema
): T | null {
  try {
    // First try direct parse
    let parsed = JSON.parse(text);
    return schema.parse(parsed) as T;
  } catch {
    // Try removing ```json fences
    try {
      const cleaned = text.replace(/```json\n?|```\n?/g, '').trim();
      let parsed = JSON.parse(cleaned);
      return schema.parse(parsed) as T;
    } catch {
      // Try extracting JSON object or array
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
          let parsed = JSON.parse(jsonMatch[0]);
          return schema.parse(parsed) as T;
        }
      } catch {}
    }
  }
  return null;
}

export const maxDuration = 30;
