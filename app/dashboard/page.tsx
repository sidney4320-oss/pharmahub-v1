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
import { Upload, StickyNote, ArrowRight, BookOpen, CalendarClock, CalendarPlus, Library, TrendingUp, Sparkles } from 'lucide-react';
import { differenceInCalendarDays } from 'date-fns';

function DashboardContent() {
  const { user } = useAuth();
  const queries = useQueries();
  const { getSubjects, getResources, getExams, getNotes, getTopics } = queries;

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    (async () => {
      const [subs, ress, exs, nts] = await Promise.all([
        getSubjects(),
        getResources(),
        getExams(),
        getNotes(),
      ]);

      if (cancelled) return;
      setSubjects(subs);
      setResources(ress);
      setExams(exs);
      setNotes(nts);

      if (subs.length > 0) {
        const allTopics = await Promise.all(subs.map((subject) => getTopics(subject.id)));
        if (!cancelled) setTopics(allTopics.flat());
      } else {
        setTopics([]);
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, getSubjects, getResources, getExams, getNotes, getTopics]);

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
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{greeting}, {capitalizedName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pick up where you left off, or choose what to study next.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={topicsInProgress[0] ? `/study?topic=${topicsInProgress[0].id}` : '/study'}
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            {topicsInProgress[0] ? 'Continue studying' : 'Choose a topic'}
          </Link>
          <Link
            href="/ai"
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            Ask PharmaHub AI
          </Link>
          <Link
            href="/library"
            className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Upload
          </Link>
        </div>
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
                subjectProgress.slice(0, 6).map(({ subject, total, pct }) => (
                  <Link key={subject.id} href={`/subjects/${subject.id}`} className="flex items-center gap-3 group">
                    <SubjectIcon icon={subject.icon} color={subject.color} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{subject.name}</p>
                      {total > 0
                        ? <ProgressBadge value={pct} showLabel={false} className="mt-1" />
                        : <p className="mt-1 text-xs text-muted-foreground">No topics yet</p>}
                    </div>
                    {total > 0 && <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">{pct}%</span>}
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
