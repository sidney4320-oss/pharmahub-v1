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
import { RESOURCE_TYPE_LABELS } from '@/lib/constants';
import { formatFileSize } from '@/lib/text-extract';
import type { Subject, Topic, Resource, Exam, Note } from '@/types/database';
import { Upload, CalendarPlus, StickyNote, HelpCircle, ArrowRight, BookOpen, CalendarClock, Library, TrendingUp, Sparkles, Plus, Mic, Send } from 'lucide-react';
import { differenceInCalendarDays } from 'date-fns';

function DashboardContent() {
  const { user } = useAuth();
  const queries = useQueries();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [quizzesCompleted, setQuizzesCompleted] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    (async () => {
      const [subs, ress, exs, nts, quizzes] = await Promise.all([
        queries.getSubjects(),
        queries.getResources(),
        queries.getExams(),
        queries.getNotes(),
        queries.getQuizzes(),
      ]);

      if (cancelled) return;
      setSubjects(subs);
      setResources(ress);
      setExams(exs);
      setNotes(nts);
      setQuizzesCompleted(quizzes.filter((quiz) => quiz.completed_at).length);

      if (subs.length > 0) {
        const allTopics = await Promise.all(subs.map((subject) => queries.getTopics(subject.id)));
        if (!cancelled) setTopics(allTopics.flat());
      } else {
        setTopics([]);
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const fullName =
    typeof user?.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : typeof user?.user_metadata?.name === 'string'
        ? user.user_metadata.name
        : '';
  const firstName = fullName.trim().split(/\s+/)[0] || user?.email?.split('@')[0]?.split('.')[0] || 'there';
  const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  const upcomingExams = useMemo(() => {
    const now = new Date();
    return exams
      .filter((exam) => new Date(exam.exam_date) >= now)
      .sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime())
      .slice(0, 3);
  }, [exams]);

  const recentResources = useMemo(() => resources.slice(0, 4), [resources]);
  const recentNotes = useMemo(() => notes.slice(0, 3), [notes]);

  const subjectProgress = useMemo(() => {
    const topicsBySubject = new Map<string, Topic[]>();

    topics.forEach((topic) => {
      const existing = topicsBySubject.get(topic.subject_id) ?? [];
      existing.push(topic);
      topicsBySubject.set(topic.subject_id, existing);
    });

    return subjects.map((subject) => {
      const subjectTopics = topicsBySubject.get(subject.id) ?? [];
      const done = subjectTopics.filter((topic) => topic.status === 'understood' || topic.status === 'mastered').length;
      const total = subjectTopics.length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      return { subject, total, done, pct };
    });
  }, [subjects, topics]);

  const topicsInProgress = useMemo(() => {
    return topics
      .filter((topic) => topic.status === 'learning' || topic.status === 'needs_revision')
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
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">{greeting}, {capitalizedName}</h1>
        <p className="text-sm text-muted-foreground mt-1">Here&apos;s what you should focus on today.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { href: '/study', title: 'Study & Explain', description: 'Review concepts and get clear explanations', icon: BookOpen },
          { href: '/quizzes', title: 'Practice & Quiz', description: 'Test your knowledge with focused quizzes', icon: HelpCircle },
          { href: '/library', title: 'Upload & Review Notes', description: 'Add PDFs, images, or text study materials', icon: Upload },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group">
              <Card className="h-full border-border/70 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
                  <div className="min-w-0"><p className="font-semibold">{item.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p></div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-card to-primary/[0.04]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" />PharmaHub AI</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border bg-background p-3 shadow-sm">
            <textarea
              rows={3}
              className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Ask about a concept, quiz topic, or upload a note..."
              aria-label="Ask PharmaHub AI"
            />
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
              <div className="flex items-center gap-1">
                <Link href="/library" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary" aria-label="Upload document"><Plus className="h-4 w-4" /></Link>
                <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary" aria-label="Voice action" disabled><Mic className="h-4 w-4" /></button>
              </div>
              <Link href="/study" className="inline-flex h-8 items-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"><Send className="h-3.5 w-3.5" />Open AI workspace</Link>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {['Explain pharmacokinetics', 'Create a quiz', 'Summarize my notes'].map((prompt) => (
              <Link key={prompt} href="/study" className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground">{prompt}</Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Study summary">
        {[
          { label: 'Topics covered', value: topics.filter((topic) => topic.status === 'understood' || topic.status === 'mastered').length, icon: BookOpen },
          { label: 'Quizzes completed', value: quizzesCompleted, icon: HelpCircle },
          { label: 'Uploaded documents', value: resources.length, icon: Library },
        ].map((metric) => (
          <Card key={metric.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary"><metric.icon className="h-4 w-4" /></div>
              <div><p className="text-xl font-bold tabular-nums">{metric.value}</p><p className="text-xs text-muted-foreground">{metric.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          {topicsInProgress.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Continue Learning</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {topicsInProgress.map((topic) => {
                  const subject = subjects.find((item) => item.id === topic.subject_id);
                  return (
                    <Link key={topic.id} href={`/topics/${topic.id}`} className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-secondary transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        {subject && <SubjectIcon icon={subject.icon} color={subject.color} size="sm" />}
                        <div className="min-w-0"><p className="text-sm font-medium truncate">{topic.name}</p><p className="text-xs text-muted-foreground truncate">{subject?.name}</p></div>
                      </div>
                      <Badge variant="secondary" className="shrink-0 capitalize text-[10px]">{topic.status.replace('_', ' ')}</Badge>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3"><div className="flex items-center justify-between gap-3"><CardTitle className="text-base flex items-center gap-2"><Library className="w-4 h-4 text-primary" />Recent Resources</CardTitle><Link href="/library" className="text-xs text-primary hover:underline shrink-0">View all</Link></div></CardHeader>
            <CardContent>
              {recentResources.length === 0 ? (
                <EmptyState icon={<Upload className="w-7 h-7" />} title="Your learning library is empty" description="Upload your first lecture note, PDF, or image to get started." action={<Link href="/library"><Button size="sm"><Upload className="w-4 h-4 mr-2" />Upload Resource</Button></Link>} />
              ) : (
                <div className="space-y-2">
                  {recentResources.map((resource) => {
                    const subject = subjects.find((item) => item.id === resource.subject_id);
                    return (
                      <Link key={resource.id} href={`/resources/${resource.id}`} className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-secondary transition-colors">
                        <div className="flex items-center gap-3 min-w-0">{subject && <SubjectIcon icon={subject.icon} color={subject.color} size="sm" />}<div className="min-w-0"><p className="text-sm font-medium truncate">{resource.title}</p><p className="text-xs text-muted-foreground truncate">{subject?.name} · {RESOURCE_TYPE_LABELS[resource.resource_type]}</p></div></div>
                        <span className="text-xs text-muted-foreground shrink-0">{formatFileSize(resource.file_size)}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {recentNotes.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><div className="flex items-center justify-between gap-3"><CardTitle className="text-base flex items-center gap-2"><StickyNote className="w-4 h-4 text-primary" />Recent Notes</CardTitle><Link href="/notes" className="text-xs text-primary hover:underline shrink-0">View all</Link></div></CardHeader>
              <CardContent className="space-y-2">
                {recentNotes.map((note) => (
                  <Link key={note.id} href="/notes" className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-secondary transition-colors">
                    <div className="min-w-0"><p className="text-sm font-medium truncate">{note.title}</p><p className="text-xs text-muted-foreground truncate">{note.content.slice(0, 60) || 'No content'}</p></div><ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Study feed</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {resources.length === 0 && upcomingExams.length === 0 ? (
                <p className="text-sm text-muted-foreground">Your latest uploads and exam updates will appear here.</p>
              ) : (
                <>
                  {recentResources.slice(0, 2).map((resource) => (
                    <Link key={resource.id} href={`/resources/${resource.id}`} className="block rounded-lg border border-border p-3 hover:bg-secondary">
                      <p className="truncate text-sm font-medium">{resource.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Resource uploaded</p>
                    </Link>
                  ))}
                  {upcomingExams.slice(0, 1).map((exam) => (
                    <Link key={exam.id} href="/exams" className="block rounded-lg border border-border p-3 hover:bg-secondary">
                      <p className="truncate text-sm font-medium">{exam.exam_name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Upcoming exam</p>
                    </Link>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><div className="flex items-center justify-between gap-3"><CardTitle className="text-base flex items-center gap-2"><CalendarClock className="w-4 h-4 text-primary" />Upcoming</CardTitle><Link href="/exams" className="text-xs text-primary hover:underline shrink-0">All exams</Link></div></CardHeader>
            <CardContent>
              {upcomingExams.length === 0 ? (
                <EmptyState icon={<CalendarClock className="w-7 h-7" />} title="No exams scheduled" description="Add your next exam to start planning." action={<Link href="/exams"><Button size="sm" variant="outline"><CalendarPlus className="w-4 h-4 mr-2" />Add Exam</Button></Link>} />
              ) : (
                <div className="space-y-3">
                  {upcomingExams.map((exam) => {
                    const subject = subjects.find((item) => item.id === exam.subject_id);
                    const days = differenceInCalendarDays(new Date(exam.exam_date), new Date());
                    return (
                      <Link key={exam.id} href="/exams" className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors">
                        {subject && <SubjectIcon icon={subject.icon} color={subject.color} size="sm" />}
                        <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{exam.exam_name}</p><p className="text-xs text-muted-foreground truncate">{subject?.name}</p></div>
                        <div className="text-right shrink-0"><p className={`text-lg font-bold ${days <= 7 ? 'text-destructive' : 'text-foreground'}`}>{days}</p><p className="text-[10px] text-muted-foreground">days left</p></div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><div className="flex items-center justify-between gap-3"><CardTitle className="text-base flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" />Your Subjects</CardTitle><Link href="/subjects" className="text-xs text-primary hover:underline shrink-0">View all</Link></div></CardHeader>
            <CardContent className="space-y-3">
              {subjectProgress.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No subjects yet.</p>
              ) : (
                subjectProgress.slice(0, 6).map(({ subject, pct }) => (
                  <Link key={subject.id} href={`/subjects/${subject.id}`} className="flex items-center gap-3 group">
                    <SubjectIcon icon={subject.icon} color={subject.color} size="sm" />
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{subject.name}</p><ProgressBadge value={pct} showLabel={false} className="mt-1" /></div>
                    <span className="text-xs font-medium tabular-nums text-muted-foreground shrink-0">{pct}%</span>
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
      <AppShell title="Dashboard" subtitle="Your study overview"><DashboardContent /></AppShell>
    </ProtectedRoute>
  );
}
