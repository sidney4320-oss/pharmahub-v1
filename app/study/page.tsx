'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/providers/protected-route';
import { AppShell } from '@/components/layout/app-shell';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { SubjectIcon } from '@/components/shared/subject-icon';
import { TOPIC_STATUS_LABELS, TOPIC_STATUS_COLORS } from '@/lib/constants';
import type { Subject, Topic, Flashcard, Concept } from '@/types/database';
import { toast } from 'sonner';
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCcw,
  Layers,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

function StudyContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialTopic = searchParams.get('topic') || '';

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTopicId, setSelectedTopicId] = useState(initialTopic);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [subs, tops] = await Promise.all([
      supabase.from('subjects').select('*').eq('user_id', user.id).order('name'),
      supabase.from('topics').select('*').order('name'),
    ]);
    setSubjects(subs.data ?? []);
    setTopics(tops.data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load flashcards and concepts when topic changes
  useEffect(() => {
    if (!selectedTopicId) return;
    (async () => {
      const [fcs, cpts] = await Promise.all([
        supabase.from('flashcards').select('*').eq('topic_id', selectedTopicId),
        supabase.from('concepts').select('*').eq('topic_id', selectedTopicId).order('created_at'),
      ]);
      setFlashcards((fcs.data as Flashcard[]) ?? []);
      setConcepts((cpts.data as Concept[]) ?? []);
      setCurrentCardIdx(0);
      setShowAnswer(false);
    })();
  }, [selectedTopicId]);

  const selectedTopic = topics.find((t) => t.id === selectedTopicId);
  const selectedSubject = subjects.find((s) => s.id === selectedTopic?.subject_id);

  const handleFlashcardStatus = async (status: 'new' | 'almost_know' | 'dont_know' | 'know') => {
    if (!flashcards[currentCardIdx]) return;
    const card = flashcards[currentCardIdx];
    await supabase.from('flashcards').update({ status }).eq('id', card.id);
    setFlashcards((prev) =>
      prev.map((c) => (c.id === card.id ? { ...c, status } : c)),
    );
    if (currentCardIdx < flashcards.length - 1) {
      setCurrentCardIdx((i) => i + 1);
      setShowAnswer(false);
    } else {
      toast.success('You finished all flashcards for this topic!');
      setCurrentCardIdx(0);
      setShowAnswer(false);
    }
  };

  const handleConceptStatus = async (conceptId: string, status: Concept['status']) => {
    await supabase.from('concepts').update({ status }).eq('id', conceptId);
    setConcepts((prev) =>
      prev.map((c) => (c.id === conceptId ? { ...c, status } : c)),
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Topic selection screen
  if (!selectedTopicId) {
    const studyableTopics = topics.filter(
      (t) => t.status === 'learning' || t.status === 'needs_revision' || t.status === 'not_started',
    );

    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-3">
            <Brain className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-semibold">Study Mode</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Pick a topic to start a focused study session.
          </p>
        </div>

        {studyableTopics.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="w-7 h-7" />}
            title="No topics to study"
            description="Add topics from your subjects and start organizing your learning materials."
            action={
              <Link href="/subjects">
                <Button variant="outline">Go to Subjects</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {studyableTopics.map((topic) => {
              const subject = subjects.find((s) => s.id === topic.subject_id);
              return (
                <Card
                  key={topic.id}
                  className="hover:shadow-sm transition-shadow cursor-pointer"
                  onClick={() => setSelectedTopicId(topic.id)}
                >
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {subject && (
                        <SubjectIcon icon={subject.icon} color={subject.color} size="sm" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{topic.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{subject?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`w-2 h-2 rounded-full ${TOPIC_STATUS_COLORS[topic.status]}`} />
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {TOPIC_STATUS_LABELS[topic.status]}
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Study session screen
  const currentCard = flashcards[currentCardIdx];
  const doneConcepts = concepts.filter(
    (c) => c.status === 'understood' || c.status === 'mastered',
  ).length;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setSelectedTopicId('')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to topics
        </button>
        {selectedSubject && (
          <Badge variant="secondary">{selectedSubject.name}</Badge>
        )}
      </div>

      <div>
        <h2 className="text-lg font-bold">{selectedTopic?.name}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{selectedTopic?.description}</p>
      </div>

      {/* Concepts section */}
      {concepts.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Concepts</h3>
              <span className="text-xs text-muted-foreground">
                {doneConcepts}/{concepts.length} understood
              </span>
            </div>
            <div className="space-y-2">
              {concepts.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-secondary/50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{c.name}</p>
                    {c.description && (
                      <p className="text-xs text-muted-foreground truncate">{c.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {(['not_started', 'learning', 'understood', 'mastered'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => handleConceptStatus(c.id, s)}
                        className={`w-5 h-5 rounded-full transition-all ${
                          c.status === s
                            ? TOPIC_STATUS_COLORS[s]
                            : 'bg-secondary hover:bg-secondary/70'
                        }`}
                        title={TOPIC_STATUS_LABELS[s]}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Flashcard section */}
      {flashcards.length > 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Flashcards
              </h3>
              <span className="text-xs text-muted-foreground">
                {currentCardIdx + 1} / {flashcards.length}
              </span>
            </div>

            <div
              className="min-h-[180px] rounded-xl border-2 border-border p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => setShowAnswer(!showAnswer)}
            >
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                {showAnswer ? 'Answer' : 'Question'}
              </p>
              <p className="text-base font-medium">
                {showAnswer ? currentCard.back : currentCard.front}
              </p>
              {!showAnswer && (
                <p className="text-xs text-muted-foreground mt-4">Tap to reveal answer</p>
              )}
            </div>

            {showAnswer && (
              <div className="grid grid-cols-4 gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleFlashcardStatus('dont_know')}
                  className="text-destructive"
                >
                  Don&apos;t Know
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleFlashcardStatus('almost_know')}
                >
                  Almost
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleFlashcardStatus('know')}
                  className="text-emerald-600"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Know
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleFlashcardStatus('new')}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Reset
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between mt-4">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setCurrentCardIdx((i) => Math.max(0, i - 1)); setShowAnswer(false); }}
                disabled={currentCardIdx === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Prev
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setCurrentCardIdx((i) => Math.min(flashcards.length - 1, i + 1)); setShowAnswer(false); }}
                disabled={currentCardIdx === flashcards.length - 1}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <EmptyState
              icon={<Layers className="w-7 h-7" />}
              title="No flashcards for this topic"
              description="Create flashcards from the topic page to use them in study mode."
              action={
                <Link href={`/topics/${selectedTopicId}`}>
                  <Button size="sm" variant="outline">
                    Go to Topic
                  </Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Quick links */}
      <div className="flex items-center gap-2">
        <Link href={`/topics/${selectedTopicId}`}>
          <Button variant="outline" size="sm">
            <BookOpen className="w-4 h-4 mr-1.5" />
            Topic Details
          </Button>
        </Link>
        <Link href={`/quizzes?topic=${selectedTopicId}`}>
          <Button variant="outline" size="sm">
            Take a Quiz
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function StudyPage() {
  return (
    <ProtectedRoute>
      <AppShell title="Study" subtitle="Focused study mode">
        <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
          <StudyContent />
        </Suspense>
      </AppShell>
    </ProtectedRoute>
  );
}
