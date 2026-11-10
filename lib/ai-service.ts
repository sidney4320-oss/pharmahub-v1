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

function getAIConfig(): AIConfig {
  const configuredProvider = process.env.NEXT_PUBLIC_AI_PROVIDER?.trim().toLowerCase();
  const supportedProviders = ['gemini'];
  const provider = configuredProvider && supportedProviders.includes(configuredProvider) ? configuredProvider : undefined;
  return { enabled: Boolean(provider), provider };
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    };
  } catch {
    return { 'Content-Type': 'application/json' };
  }
}

export const aiService = {
  config: getAIConfig(),

  isAvailable(): boolean {
    return this.config.enabled;
  },

  async generateSummary(text: string, _context?: string): Promise<SummaryResult | null> {
    if (!this.isAvailable()) return null;
    try {
      const response = await fetch('/api/ai/generate-summary', { method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify({ text }) });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  },

  async generateFlashcards(text: string, count?: number): Promise<FlashcardResult[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const response = await fetch('/api/ai/generate-flashcards', { method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify({ text, count: count || 10 }) });
      if (!response.ok) return null;
      const data = await response.json();
      return data.flashcards as FlashcardResult[];
    } catch { return null; }
  },

  async generateQuiz(text: string, questionCount: number, difficulty: string, questionType: string, topic?: string): Promise<QuizQuestionResult[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const response = await fetch('/api/ai/generate-quiz', { method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify({ text, questionCount, difficulty, questionType, topic }) });
      if (!response.ok) return null;
      const data = await response.json();
      return data.questions as QuizQuestionResult[];
    } catch { return null; }
  },

  async explainConcept(concept: string, context?: string): Promise<ExplainResult | null> {
    if (!this.isAvailable()) return null;
    try {
      const response = await fetch('/api/ai/explain', { method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify({ concept, context }) });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  },

  async answerQuestion(question: string, _sources?: { title: string; text: string }[]): Promise<ExplainResult | null> {
    return this.explainConcept(question);
  },

  async analyzeImage(_imageBase64: string, _prompt?: string): Promise<ExplainResult | null> {
    if (!this.isAvailable()) return null;
    return null;
  },
};
