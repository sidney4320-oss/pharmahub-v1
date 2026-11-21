import { supabase } from '@/lib/supabase/client';

export interface AIConfig {
  enabled: boolean;
  provider?: string;
}

export interface SummaryResult {
  summary: string;
  keyPoints: string[];
}

export interface FlashcardResult {
  front: string;
  back: string;
}

export interface QuizQuestionResult {
  question: string;
  type: 'mcq' | 'true_false' | 'short_answer';
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface ExplainResult {
  explanation: string;
  sources: { title: string; snippet: string }[];
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Please sign in again before using AI features.');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
}

let lastError: string | null = null;

async function requestJSON<T>(url: string, body: unknown): Promise<T | null> {
  try {
    lastError = null;
    const res = await fetch(url, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      if (res.status === 401) {
        lastError = 'Your session has expired. Please sign in again.';
      } else if (res.status === 429) {
        lastError = 'AI usage limit reached. Please wait a minute and try again.';
      } else if (res.status >= 500) {
        lastError = payload?.error || 'The AI service is temporarily unavailable.';
      } else {
        lastError = payload?.error || 'The AI request could not be completed.';
      }
      console.error('AI request failed:', lastError);
      return null;
    }

    return await res.json() as T;
  } catch (error) {
    lastError = error instanceof Error ? error.message : 'Could not connect to the AI service.';
    console.error('AI request error:', error);
    return null;
  }
}

export const aiService = {
  config: { enabled: true, provider: 'gemini' } as AIConfig,

  isAvailable(): boolean {
    return true;
  },

  getLastError(): string | null {
    return lastError;
  },

  async generateSummary(text: string, _context?: string): Promise<SummaryResult | null> {
    return requestJSON<SummaryResult>('/api/ai/generate-summary', { text });
  },

  async generateFlashcards(text: string, count = 10): Promise<FlashcardResult[] | null> {
    const data = await requestJSON<{ flashcards: FlashcardResult[] }>('/api/ai/generate-flashcards', { text, count });
    return data?.flashcards ?? null;
  },

  async generateQuiz(
    text: string,
    questionCount: number,
    difficulty: string,
    questionType: string,
    topic?: string,
  ): Promise<QuizQuestionResult[] | null> {
    const data = await requestJSON<{ questions: QuizQuestionResult[] }>('/api/ai/generate-quiz', {
      text,
      questionCount,
      difficulty,
      questionType,
      topic,
    });
    return data?.questions ?? null;
  },

  async explainConcept(concept: string, context?: string): Promise<ExplainResult | null> {
    return requestJSON<ExplainResult>('/api/ai/explain', { concept, context });
  },

  async answerQuestion(question: string, sources?: { title: string; text: string }[]): Promise<ExplainResult | null> {
    return this.explainConcept(question, sources?.map((source) => source.text).join('\n'));
  },

  async analyzeImage(_imageBase64: string, _prompt?: string): Promise<ExplainResult | null> {
    return null;
  },
};
