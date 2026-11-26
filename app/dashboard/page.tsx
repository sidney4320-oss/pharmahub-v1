'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/providers/protected-route';
import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/components/providers/auth-provider';
import { useQueries } from '@/hooks/use-queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { SubjectIcon } from '@/components/shared/subject-icon';
import { ResourceIcon } from '@/components/shared/resource-icon';
import { ProgressBadge } from '@/components/shared/progress-badge';
import { Textarea } from '@/components/ui/textarea';
import { RESOURCE_TYPE_LABELS } from '@/lib/constants';
import { formatFileSize } from '@/lib/text-extract';
import type { Subject, Topic, Resource, Exam, Note, Quiz } from '@/types/database';
import {
  Upload,
  CalendarPlus,
  StickyNote,
  HelpCircle,
  ArrowRight,
  BookOpen,
  CalendarClock,
  Library,
  TrendingUp,
  Sparkles,
  Send,
  Mic,
  Loader2,
} from 'lucide-react';
import { differenceInCalendarDays } from 'date-fns';
import { aiService } from '@/lib/ai-service';

function DashboardContent() {
  const { user, session } = useAuth();
  const queries = useQueries();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnswer, setAiAnswer] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [subs, ress, exs, nts, qzs] = await Promise.all([
        queries.getSubjects(),
        queries.getResources(),
        queries.getExams(),
        queries.getNotes(),
        queries.getQuizzes(),
      ]);
      setSubjects(subs);
      setResources(ress);
      setExams(exs);
      setNotes(nts);
      setQuizzes(qzs);

      // Fetch topics for all subjects
      const allTopics = await Promise.all(subs.map((s) => queries.getTopics(s.id)));
      setTopics(allTopics.flat());

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const displayName =
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.name as string) ||
    user?.email?.split('@')[0]?.split('.')[0] ||
    'Student';
  const capitalizedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

  const handleAIQuestion = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiAnswer('');
    const result = await aiService.answerQuestion(aiPrompt.trim(), session?.access_token);
    setAiLoading(false);
    if (result) setAiAnswer(result.explanation);
  };

  const upcomingExams = useMemo(() => {
    const now = new Date();
    return exams
      .filter((e) => new Date(e.exam_date) >= now)
      .sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime())
      .slice(0, 3);
  }, [exams]);

  const recentResources = useMemo(() => resources.slice(0, 4), [resources]);
  const recentNotes = useMemo(() => notes.slice(0, 3), [notes]);

  const subjectProgress = useMemo(() => {
    return subjects.map((s) => {
      const subTopics = topics.filter((t) => t.subject_id === s.id);
      const done = subTopics.filter(
        (t) => t.status === 'understood' || t.status === 'mastered',
      ).length;
      const total = subTopics.length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      return { subject: s, total, done, pct };
    });
  }, [subjects, topics]);

  const topicsInProgress = useMemo(() => {
    return topics
      .filter((t) => t.status === 'learning' || t.status === 'needs_revision')
      .slice(0, 3);
  }, [topics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Greeting */}
      <div>
        <h1 className="text-xl lg:text-2xl font-bold">
          Welcome, {capitalizedName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {greeting}. Here&apos;s what you should focus on today.
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Link href="/library">
          <Card className="h-full hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer border-primary/20 bg-primary/5">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-sm font-semibold">Study &amp; Explain</span>
                  <p className="text-xs text-muted-foreground mt-1">Turn concepts into clear explanations</p>
                </div>
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary"><BookOpen className="w-5 h-5" /></div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/quizzes">
          <Card className="h-full hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-sm font-semibold">Practice &amp; Quiz</span>
                  <p className="text-xs text-muted-foreground mt-1">Test recall and identify weak areas</p>
                </div>
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary text-foreground"><HelpCircle className="w-5 h-5" /></div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/library">
          <Card className="h-full hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-sm font-semibold">Upload &amp; Review Notes</span>
                  <p className="text-xs text-muted-foreground mt-1">Add notes, PDFs, and study images</p>
                </div>
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary text-foreground"><Upload className="w-5 h-5" /></div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column — main content */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Sparkles className="h-4 w-4" /></span>
                PharmaHub AI
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ask for an explanation, summary, or study prompt..."
                rows={3}
                className="resize-none"
                aria-label="Ask PharmaHub AI"
              />
              {aiAnswer && (
                <div className="rounded-lg border bg-secondary/40 p-3 text-sm" role="status" aria-live="polite">
                  {aiAnswer}
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2">
                  {['Explain this topic', 'Create a quiz', 'Summarize my notes'].map((prompt) => (
                    <button key={prompt} type="button" onClick={() => setAiPrompt(prompt)} className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground">
                      {prompt}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg border text-muted-foreground hover:bg-secondary" aria-label="Voice input">
                    <Mic className="h-4 w-4" />
                  </button>
                  <Button size="sm" onClick={handleAIQuestion} disabled={aiLoading || !aiPrompt.trim()} aria-busy={aiLoading}>
                    {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="mr-2 h-4 w-4" />Ask AI</>}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Topics covered', value: topics.filter((t) => t.status === 'understood' || t.status === 'mastered').length },
              { label: 'Quizzes completed', value: quizzes.filter((quiz) => quiz.completed_at).length },
              { label: 'Uploaded documents', value: resources.length },
            ].map((metric) => (
              <Card key={metric.label}>
                <CardContent className="p-4">
                  <p className="text-2xl font-bold tabular-nums">{metric.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{metric.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Continue learning */}
          {topicsInProgress.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Continue Learning
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {topicsInProgress.map((topic) => {
                  const subject = subjects.find((s) => s.id === topic.subject_id);
                  return (
                    <Link
                      key={topic.id}
                      href={`/topics/${topic.id}`}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {subject && (
                          <SubjectIcon icon={subject.icon} color={subject.color} size="sm" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{topic.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {subject?.name}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="shrink-0 capitalize">
                        {topic.status.replace('_', ' ')}
                      </Badge>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Recent resources */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Library className="w-4 h-4 text-primary" />
                  Recent Resources
                </CardTitle>
                <Link href="/library" className="text-xs text-primary hover:underline">
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentResources.length === 0 ? (
                <EmptyState
                  icon={<Upload className="w-7 h-7" />}
                  title="Your learning library is empty"
                  description="Upload your first lecture note, PDF, or image to get started."
                  action={
                    <Link href="/library">
                      <Button size="sm">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Resource
                      </Button>
                    </Link>
                  }
                />
              ) : (
                <div className="space-y-2">
                  {recentResources.map((r) => {
                    const subject = subjects.find((s) => s.id === r.subject_id);
                    return (
                      <Link
                        key={r.id}
                        href={`/resources/${r.id}`}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {subject && (
                            <SubjectIcon icon={subject.icon} color={subject.color} size="sm" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{r.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {subject?.name} · {RESOURCE_TYPE_LABELS[r.resource_type]}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatFileSize(r.file_size)}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent notes */}
          {recentNotes.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-primary" />
                    Recent Notes
                  </CardTitle>
                  <Link href="/notes" className="text-xs text-primary hover:underline">
                    View all
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentNotes.map((n) => (
                  <Link
                    key={n.id}
                    href="/notes"
                    className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {n.content.slice(0, 60) || 'No content'}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column — sidebar content */}
        <div className="space-y-6">
          {/* Upcoming exams */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-primary" />
                  Upcoming
                </CardTitle>
                <Link href="/exams" className="text-xs text-primary hover:underline">
                  All exams
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {upcomingExams.length === 0 ? (
                <EmptyState
                  icon={<CalendarClock className="w-7 h-7" />}
                  title="No exams scheduled"
                  description="Add your next exam to start planning."
                  action={
                    <Link href="/exams">
                      <Button size="sm" variant="outline">
                        <CalendarPlus className="w-4 h-4 mr-2" />
                        Add Exam
                      </Button>
                    </Link>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {upcomingExams.map((exam) => {
                    const subject = subjects.find((s) => s.id === exam.subject_id);
                    const days = differenceInCalendarDays(new Date(exam.exam_date), new Date());
                    return (
                      <Link
                        key={exam.id}
                        href="/exams"
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
                      >
                        {subject && (
                          <SubjectIcon icon={subject.icon} color={subject.color} size="sm" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{exam.exam_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {subject?.name}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p
                            className={`text-lg font-bold ${
                              days <= 7 ? 'text-destructive' : 'text-foreground'
                            }`}
                          >
                            {days}
                          </p>
                          <p className="text-[10px] text-muted-foreground">days left</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subject progress */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Your Subjects
                </CardTitle>
                <Link href="/subjects" className="text-xs text-primary hover:underline">
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {subjectProgress.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No subjects yet.
                </p>
              ) : (
                subjectProgress.slice(0, 6).map(({ subject, pct, total }) => (
                  <Link
                    key={subject.id}
                    href={`/subjects/${subject.id}`}
                    className="flex items-center gap-3 group"
                  >
                    <SubjectIcon icon={subject.icon} color={subject.color} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {subject.name}
                      </p>
                      <ProgressBadge value={pct} showLabel={false} className="mt-1" />
                    </div>
                    <span className="text-xs font-medium tabular-nums text-muted-foreground shrink-0">
                      {pct}%
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <AppShell title="Dashboard" subtitle="Your study overview">
        <DashboardContent />
      </AppShell>
    </ProtectedRoute>
  );
}
