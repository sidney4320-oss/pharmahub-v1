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
  const provider = process.env.NEXT_PUBLIC_AI_PROVIDER;
  return {
    enabled: Boolean(provider && provider !== 'none'),
    provider: provider || undefined,
  };
}

export const aiService = {
  config: getAIConfig(),

  isAvailable(): boolean {
    return this.config.enabled;
  },

  async generateSummary(text: string, _context?: string): Promise<SummaryResult | null> {
    if (!this.isAvailable()) return null;
    // Integration point: call AI provider to summarize text
    return null;
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
    _questionCount: number,
    _difficulty: string,
    _questionType: string,
  ): Promise<QuizQuestionResult[] | null> {
    if (!this.isAvailable()) return null;
    // Integration point: call AI provider to generate quiz questions
    return null;
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
    _sources?: { title: string; text: string }[],
  ): Promise<ExplainResult | null> {
    if (!this.isAvailable()) return null;
    // Integration point: call AI provider with RAG context
    return null;
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
