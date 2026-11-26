/**
 * AI Service Abstraction Layer
 *
 * This module provides a clean interface for AI-powered features.
 * The underlying provider can be swapped without touching the UI.
 *
 * Integration point: To enable AI, set the AI_PROVIDER env var and
 * implement the provider-specific calls in the respective methods.
 * Until then, methods return null so the UI can show "AI not configured".
 */

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
  const provider = process.env.NEXT_PUBLIC_AI_PROVIDER || 'gemini-2.5-flash';
  return {
    enabled: Boolean(provider && provider !== 'none'),
    provider: provider || undefined,
  };
}

async function aiRequest(action: string, payload: Record<string, unknown>, accessToken?: string) {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ action, payload }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'AI request failed.');
  return data;
}

export const aiService = {
  config: getAIConfig(),

  isAvailable(): boolean {
    return this.config.enabled;
  },

  async generateSummary(text: string, context?: string, accessToken?: string): Promise<SummaryResult | null> {
    if (!this.isAvailable()) return null;
    const data = await aiRequest('summary', { text, context }, accessToken);
    return data as SummaryResult;
  },

  async generateFlashcards(
    text: string,
    _count?: number,
  ): Promise<FlashcardResult[] | null> {
    if (!this.isAvailable()) return null;
    // Integration point: call AI provider to generate flashcards
    return null;
  },

  async generateQuiz(
    text: string,
    questionCount: number,
    difficulty: string,
    questionType: string,
    accessToken?: string,
  ): Promise<QuizQuestionResult[] | null> {
    if (!this.isAvailable()) return null;
    const data = await aiRequest('quiz', { text, questionCount, difficulty, questionType }, accessToken);
    return data.questions as QuizQuestionResult[];
  },

  async explainConcept(
    concept: string,
    _context?: string,
  ): Promise<ExplainResult | null> {
    if (!this.isAvailable()) return null;
    // Integration point: call AI provider to explain concept
    return null;
  },

  async answerQuestion(
    question: string,
    sourcesOrToken?: { title: string; text: string }[] | string,
    accessToken?: string,
  ): Promise<ExplainResult | null> {
    if (!this.isAvailable()) return null;
    const sources = Array.isArray(sourcesOrToken) ? sourcesOrToken : undefined;
    const token = typeof sourcesOrToken === 'string' ? sourcesOrToken : accessToken;
    const data = await aiRequest('answer', { question, sources }, token);
    return data as ExplainResult;
  },

  async analyzeImage(
    _imageBase64: string,
    _prompt?: string,
  ): Promise<ExplainResult | null> {
    if (!this.isAvailable()) return null;
    // Integration point: call AI vision provider
    return null;
  },
};
