'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/providers/protected-route';
import { AppShell } from '@/components/layout/app-shell';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/shared/empty-state';
import { SubjectIcon } from '@/components/shared/subject-icon';
import { QUIZ_DIFFICULTY_LABELS, QUIZ_QUESTION_TYPE_LABELS } from '@/lib/constants';
import { aiService } from '@/lib/ai-service';
import type { Subject, Topic, Quiz, Question } from '@/types/database';
import { toast } from 'sonner';
import {
  HelpCircle,
  Plus,
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Trophy,
  AlertCircle,
} from 'lucide-react';

type Difficulty = 'basic' | 'intermediate' | 'advanced';
type QType = 'mcq' | 'true_false' | 'short_answer' | 'mixed';

function QuizzesContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialTopic = searchParams.get('topic') || '';

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate dialog
  const [genOpen, setGenOpen] = useState(false);
  const [genSubject, setGenSubject] = useState('');
  const [genTopic, setGenTopic] = useState(initialTopic);
  const [genCount, setGenCount] = useState('10');
  const [genDifficulty, setGenDifficulty] = useState<Difficulty>('intermediate');
  const [genQType, setGenQType] = useState<QType>('mcq');
  const [generating, setGenerating] = useState(false);

  // Quiz taking state
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [subs, tops, qzs] = await Promise.all([
      supabase.from('subjects').select('*').eq('user_id', user.id).order('name'),
      supabase.from('topics').select('*').order('name'),
      supabase
        .from('quizzes')
        .select('*, subject:subjects(*), topic:topics(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);
    setSubjects(subs.data ?? []);
    setTopics(tops.data ?? []);
    setQuizzes((qzs.data as Quiz[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const availableTopics = topics.filter((t) => t.subject_id === genSubject);

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);

    const topic = topics.find((t) => t.id === genTopic);
    const subject = subjects.find((s) => s.id === genSubject);

    // Create quiz record
    const { data: quizData, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        user_id: user.id,
        subject_id: genSubject || null,
        topic_id: genTopic || null,
        title: `${topic?.name || subject?.name || 'General'} Quiz`,
        difficulty: genDifficulty,
        question_type: genQType,
        question_count: parseInt(genCount),
      })
      .select()
      .single();

    if (quizError || !quizData) {
      toast.error('Could not create quiz');
      setGenerating(false);
      return;
    }

    // Try AI generation
    if (aiService.isAvailable()) {
      const result = await aiService.generateQuiz(
        '', // Would pass extracted text from resources
        parseInt(genCount),
        genDifficulty,
        genQType,
      );

      if (result && result.length > 0) {
        const { error: qError } = await supabase.from('questions').insert(
          result.map((q) => ({
            quiz_id: quizData.id,
            question_text: q.question,
            question_type: q.type,
            options: q.options || null,
            correct_answer: q.correctAnswer,
            explanation: q.explanation,
          })),
        );

        if (qError) {
          toast.error('Quiz created but questions could not be saved');
        } else {
          toast.success('Quiz generated!');
          setGenOpen(false);
          setGenerating(false);
          loadData();
          return;
        }
      }
    }

    // AI not available — create placeholder questions
    const placeholderQuestions: Array<{
      quiz_id: string;
      question_text: string;
      question_type: string;
      options: string[] | null;
      correct_answer: string;
      explanation: string;
    }> = [];

    const type = genQType === 'mixed' ? 'mcq' : genQType;
    for (let i = 0; i < parseInt(genCount); i++) {
      if (type === 'mcq') {
        placeholderQuestions.push({
          quiz_id: quizData.id,
          question_text: `Question ${i + 1}: What is a key concept in ${topic?.name || subject?.name || 'pharmacy'}?`,
          question_type: 'mcq',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correct_answer: 'Option A',
          explanation: 'This is a placeholder question. Connect an AI provider to generate real questions from your materials.',
        });
      } else if (type === 'true_false') {
        placeholderQuestions.push({
          quiz_id: quizData.id,
          question_text: `True or False: ${topic?.name || subject?.name || 'Pharmacy'} involves understanding key concepts.`,
          question_type: 'true_false',
          options: ['True', 'False'],
          correct_answer: 'True',
          explanation: 'This is a placeholder question. Connect an AI provider to generate real questions.',
        });
      } else {
        placeholderQuestions.push({
          quiz_id: quizData.id,
          question_text: `Briefly explain a key concept in ${topic?.name || subject?.name || 'pharmacy'}.`,
          question_type: 'short_answer',
          options: null,
          correct_answer: 'Sample answer — connect AI for real grading.',
          explanation: 'This is a placeholder question. Connect an AI provider to generate real questions.',
        });
      }
    }

    const { error: qError } = await supabase.from('questions').insert(placeholderQuestions);
    if (qError) {
      toast.error('Quiz created but questions could not be saved');
    } else {
      toast.success('Quiz created! AI is not configured, so placeholder questions were added.');
      setGenOpen(false);
      loadData();
    }
    setGenerating(false);
  };

  const handleStartQuiz = async (quiz: Quiz) => {
    const { data: qs } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', quiz.id)
      .order('created_at');
    if (qs && qs.length > 0) {
      setActiveQuiz(quiz);
      setActiveQuestions(qs as Question[]);
      setCurrentQ(0);
      setAnswers({});
      setShowResults(false);
    } else {
      toast.error('This quiz has no questions');
    }
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz || !user) return;
    let correct = 0;
    for (const q of activeQuestions) {
      const userAnswer = answers[q.id] || '';
      const isCorrect = userAnswer === q.correct_answer;
      if (isCorrect) correct++;
      await supabase
        .from('questions')
        .update({ user_answer: userAnswer, is_correct: isCorrect })
        .eq('id', q.id);
    }
    await supabase
      .from('quizzes')
      .update({ score: correct, completed_at: new Date().toISOString() })
      .eq('id', activeQuiz.id);
    setShowResults(true);
    loadData();
  };

  const handleDeleteQuiz = async (id: string) => {
    const { error } = await supabase.from('quizzes').delete().eq('id', id);
    if (error) {
      toast.error('Could not delete quiz');
    } else {
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
      toast.success('Quiz deleted');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Active quiz taking
  if (activeQuiz && activeQuestions.length > 0) {
    const q = activeQuestions[currentQ];
    const isLast = currentQ === activeQuestions.length - 1;

    if (showResults) {
      const correct = activeQuestions.filter((q) => q.id in answers && answers[q.id] === q.correct_answer).length;
      const pct = Math.round((correct / activeQuestions.length) * 100);

      return (
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="text-center py-6">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3 ${
              pct >= 70 ? 'bg-emerald-500/10 text-emerald-600' : pct >= 40 ? 'bg-amber-500/10 text-amber-600' : 'bg-destructive/10 text-destructive'
            }`}>
              <Trophy className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold">{pct}%</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {correct} out of {activeQuestions.length} correct
            </p>
          </div>

          <div className="space-y-3">
            {activeQuestions.map((q, i) => {
              const userAns = answers[q.id] || 'Not answered';
              const isCorrect = userAns === q.correct_answer;
              return (
                <Card key={q.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`flex items-center justify-center w-6 h-6 rounded-full shrink-0 ${
                        isCorrect ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'
                      }`}>
                        {isCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{i + 1}. {q.question_text}</p>
                        <div className="mt-2 space-y-1 text-xs">
                          <p className="text-muted-foreground">
                            Your answer: <span className={isCorrect ? 'text-emerald-600 font-medium' : 'text-destructive font-medium'}>{userAns}</span>
                          </p>
                          {!isCorrect && (
                            <p className="text-emerald-600">
                              Correct answer: <span className="font-medium">{q.correct_answer}</span>
                            </p>
                          )}
                          {q.explanation && (
                            <p className="text-muted-foreground italic mt-1">{q.explanation}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex gap-2">
            <Button onClick={() => { setActiveQuiz(null); setActiveQuestions([]); setShowResults(false); }} className="flex-1">
              Back to Quizzes
            </Button>
            <Button
              variant="outline"
              onClick={() => { setCurrentQ(0); setAnswers({}); setShowResults(false); }}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Retake
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => { setActiveQuiz(null); setActiveQuestions([]); }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Exit Quiz
          </button>
          <Badge variant="secondary">{currentQ + 1} / {activeQuestions.length}</Badge>
        </div>

        <h2 className="text-lg font-bold">{activeQuiz.title}</h2>

        <Card>
          <CardContent className="p-6">
            <p className="text-base font-medium mb-4">{q.question_text}</p>

            {q.question_type === 'mcq' && q.options && (
              <RadioGroup
                value={answers[q.id] || ''}
                onValueChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
              >
                <div className="space-y-2">
                  {q.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-secondary/50 transition-colors cursor-pointer">
                      <RadioGroupItem value={opt} id={`opt-${i}`} />
                      <Label htmlFor={`opt-${i}`} className="text-sm cursor-pointer flex-1">{opt}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}

            {q.question_type === 'true_false' && q.options && (
              <RadioGroup
                value={answers[q.id] || ''}
                onValueChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
              >
                <div className="space-y-2">
                  {q.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-secondary/50 transition-colors cursor-pointer">
                      <RadioGroupItem value={opt} id={`tf-${i}`} />
                      <Label htmlFor={`tf-${i}`} className="text-sm cursor-pointer flex-1">{opt}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}

            {q.question_type === 'short_answer' && (
              <Input
                placeholder="Type your answer..."
                value={answers[q.id] || ''}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQ((i) => Math.max(0, i - 1))}
            disabled={currentQ === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          {isLast ? (
            <Button onClick={handleSubmitQuiz}>
              <Check className="w-4 h-4 mr-1" />
              Submit Quiz
            </Button>
          ) : (
            <Button onClick={() => setCurrentQ((i) => i + 1)}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Quiz list
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {quizzes.length} {quizzes.length === 1 ? 'quiz' : 'quizzes'}
        </p>
        <Button onClick={() => setGenOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Quiz
        </Button>
      </div>

      {!aiService.isAvailable() && (
        <div className="flex items-start gap-3 bg-secondary/50 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">AI not configured</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Quizzes will use placeholder questions. Connect an AI provider to generate real questions from your uploaded materials.
            </p>
          </div>
        </div>
      )}

      {quizzes.length === 0 ? (
        <EmptyState
          icon={<HelpCircle className="w-7 h-7" />}
          title="No quizzes yet"
          description="Generate a quiz from your materials to test your knowledge."
          action={
            <Button onClick={() => setGenOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Quiz
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {quizzes.map((quiz) => {
            const subject = subjects.find((s) => s.id === quiz.subject_id);
            const topic = topics.find((t) => t.id === quiz.topic_id);
            return (
              <Card key={quiz.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {subject && (
                        <SubjectIcon icon={subject.icon} color={subject.color} size="sm" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{quiz.title}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {topic && (
                            <Badge variant="outline" className="text-[10px]">{topic.name}</Badge>
                          )}
                          <Badge variant="secondary" className="text-[10px]">
                            {QUIZ_DIFFICULTY_LABELS[quiz.difficulty]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {quiz.question_count} questions
                          </span>
                          {quiz.score !== null && quiz.completed_at && (
                            <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600">
                              Score: {quiz.score}/{quiz.question_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => handleStartQuiz(quiz)}>
                        {quiz.completed_at ? 'Retake' : 'Start'}
                      </Button>
                      <button
                        onClick={() => handleDeleteQuiz(quiz.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Generate dialog */}
      {genOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setGenOpen(false)}>
          <div className="bg-card rounded-xl border shadow-lg max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Generate Quiz</h3>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={genSubject} onValueChange={(v) => { setGenSubject(v); setGenTopic(''); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Topic (optional)</Label>
                <Select value={genTopic} onValueChange={setGenTopic} disabled={!genSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTopics.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Number of questions</Label>
                <Select value={genCount} onValueChange={setGenCount}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 questions</SelectItem>
                    <SelectItem value="10">10 questions</SelectItem>
                    <SelectItem value="20">20 questions</SelectItem>
                    <SelectItem value="30">30 questions</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select value={genDifficulty} onValueChange={(v) => setGenDifficulty(v as Difficulty)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(QUIZ_DIFFICULTY_LABELS) as Difficulty[]).map((d) => (
                        <SelectItem key={d} value={d}>{QUIZ_DIFFICULTY_LABELS[d]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Question type</Label>
                  <Select value={genQType} onValueChange={(v) => setGenQType(v as QType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(QUIZ_QUESTION_TYPE_LABELS) as QType[]).map((t) => (
                        <SelectItem key={t} value={t}>{QUIZ_QUESTION_TYPE_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setGenOpen(false)}>Cancel</Button>
              <Button onClick={handleGenerate} disabled={generating || !genSubject}>
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuizzesPage() {
  return (
    <ProtectedRoute>
      <AppShell title="Quizzes" subtitle="Test your knowledge">
        <QuizzesContent />
      </AppShell>
    </ProtectedRoute>
  );
}
