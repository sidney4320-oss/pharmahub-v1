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

export interface ChatResult {
  reply: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();

  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
}

async function requestJSON<T>(url: string, body: unknown): Promise<T | null> {
  const res = await fetch(url, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(body),
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(payload?.error || `AI request failed (${res.status})`);
  }

  return payload as T;
}

export const aiService = {
  config: { enabled: true, provider: 'gemini' } as AIConfig,

  isAvailable(): boolean {
    return true;
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

  async answerQuestion(
    question: string,
    sources?: { title: string; text: string }[],
  ): Promise<ChatResult | null> {
    return requestJSON<ChatResult>('/api/ai/chat', {
      message: question,
      context: sources?.map((source) => `${source.title}: ${source.text}`).join('\n').slice(0, 8000),
    });
  },

  async analyzeImage(_imageBase64: string, _prompt?: string): Promise<ExplainResult | null> {
    return null;
  },
};
