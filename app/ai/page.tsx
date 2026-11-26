'use client';

import { useRef, useState } from 'react';
import { ProtectedRoute } from '@/components/providers/protected-route';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { aiService } from '@/lib/ai-service';
import { Brain, Loader2, RotateCcw, Send, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const suggestions = [
  'Explain the mechanism of beta-blockers',
  'Compare first-generation and second-generation antihistamines',
  'Create a study plan for pharmacokinetics',
];

function AIWorkspaceContent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastQuestion, setLastQuestion] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const submitQuestion = async (question: string) => {
    const message = question.trim();
    if (!message || loading) return;

    setLoading(true);
    setError('');
    setLastQuestion(message);
    setInput('');
    setMessages((current) => [...current, { role: 'user', content: message }]);

    try {
      const result = await aiService.answerQuestion(
        message,
        messages
          .filter((item) => item.role === 'assistant')
          .slice(-2)
          .map((item, index) => ({ title: `Previous response ${index + 1}`, text: item.content })),
      );

      if (!result?.reply) {
        throw new Error('The AI service could not return a response.');
      }
      setMessages((current) => [...current, { role: 'assistant', content: result.reply }]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to reach the AI service.');
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      });
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-11rem)] min-h-[320px] max-w-4xl flex-col lg:h-[calc(100dvh-8rem)]">
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Brain className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-bold">PharmaHub AI</h1>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Ask questions, clarify concepts, and build a study plan using real AI assistance.
              </p>
              <div className="mt-6 grid w-full max-w-2xl gap-2 sm:grid-cols-3">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => submitQuestion(suggestion)}
                    className="rounded-lg border border-border px-3 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-secondary hover:text-foreground"
                  >
                    <Sparkles className="mb-2 h-4 w-4 text-primary" />
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4" aria-live="polite" aria-relevant="additions text">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[75%] ${
                      message.role === 'user'
                        ? 'rounded-br-md bg-primary text-primary-foreground'
                        : 'rounded-bl-md border border-border bg-secondary/60'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-border bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Thinking
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-border p-3 sm:p-4">
          {error && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
              <span className="text-destructive">{error}</span>
              {lastQuestion && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => submitQuestion(lastQuestion)}
                  disabled={loading}
                  className="shrink-0"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Retry
                </Button>
              )}
            </div>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submitQuestion(input);
            }}
            className="flex items-end gap-2"
          >
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  submitQuestion(input);
                }
              }}
              placeholder="Ask a pharmacy question..."
              className="min-h-[48px] max-h-32 resize-none"
              disabled={loading}
              aria-label="Message PharmaHub AI"
            />
            <Button type="submit" size="icon" className="h-12 w-12 shrink-0" disabled={loading || !input.trim()} aria-label="Send message">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

export default function AIPage() {
  return (
    <ProtectedRoute>
      <AppShell title="PharmaHub AI" subtitle="Contextual learning assistant">
        <AIWorkspaceContent />
      </AppShell>
    </ProtectedRoute>
  );
}
