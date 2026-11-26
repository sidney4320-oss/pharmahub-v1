'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/providers/protected-route';
import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { SubjectIcon } from '@/components/shared/subject-icon';
import { EmptyState } from '@/components/shared/empty-state';
import type { Subject, Topic } from '@/types/database';
import { TOPIC_STATUS_LABELS, TOPIC_STATUS_COLORS } from '@/lib/constants';
import { FileText, ChevronRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface TopicWithSubject extends Topic {
  subject: Subject;
}

function TopicsContent() {
  const { user } = useAuth();
  const [topics, setTopics] = useState<TopicWithSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: subs } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (!subs || subs.length === 0) {
        setLoading(false);
        return;
      }

      const subjectMap = new Map(subs.map((s) => [s.id, s]));
      const { data: tops } = await supabase
        .from('topics')
        .select('*')
        .in('subject_id', subs.map((s) => s.id))
        .order('updated_at', { ascending: false });

      const topicsWithSubjects = (tops ?? [])
        .map((t) => ({
          ...t,
          subject: subjectMap.get(t.subject_id),
        }))
        .filter((t) => t.subject) as TopicWithSubject[];

      setTopics(topicsWithSubjects);
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const query = search.trim().toLowerCase();
  const filteredTopics = topics.filter((topic) =>
    !query ||
    topic.name.toLowerCase().includes(query) ||
    topic.subject.name.toLowerCase().includes(query),
  );
  const topicsBySubject = new Map<string, TopicWithSubject[]>();
  filteredTopics.forEach((topic) => {
    const group = topicsBySubject.get(topic.subject_id) ?? [];
    group.push(topic);
    topicsBySubject.set(topic.subject_id, group);
  });

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {topics.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search topics or subjects..."
            aria-label="Search topics or subjects"
            className="pl-9"
          />
        </div>
      )}
      {topics.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-7 h-7" />}
          title="No topics yet"
          description="Topics help you organize resources by what you're learning. Add topics from any subject page."
          action={
            <Link href="/subjects">
              <button className="text-sm text-primary font-medium hover:underline">
                Go to Subjects →
              </button>
            </Link>
          }
        />
      ) : filteredTopics.length === 0 ? (
        <EmptyState
          icon={<Search className="w-7 h-7" />}
          title="No topics found"
          description="Try a different topic or subject name."
        />
      ) : (
        <div className="space-y-6">
          {Array.from(topicsBySubject.values())
            .sort((a, b) => a[0].subject.name.localeCompare(b[0].subject.name))
            .map((subjectTopics) => {
            const subject = subjectTopics[0].subject;
            return (
              <section key={subject.id} aria-labelledby={`subject-${subject.id}`}>
                <div className="mb-2 flex items-center gap-2">
                  <SubjectIcon icon={subject.icon} color={subject.color} size="sm" />
                  <h2 id={`subject-${subject.id}`} className="text-sm font-semibold">{subject.name}</h2>
                  <span className="text-xs text-muted-foreground">{subjectTopics.length}</span>
                </div>
                <div className="space-y-2">
                  {subjectTopics.map((topic) => (
                    <Link key={topic.id} href={`/topics/${topic.id}`} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <Card className="transition-colors hover:border-primary/30 hover:bg-secondary/30">
                        <CardContent className="flex items-center justify-between gap-3 p-4">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{topic.name}</p>
                            {topic.description && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{topic.description}</p>}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${TOPIC_STATUS_COLORS[topic.status]}`} />
                            <span className="hidden text-xs text-muted-foreground sm:inline">
                              {TOPIC_STATUS_LABELS[topic.status]}
                            </span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            );
            })}
        </div>
      )}
    </div>
  );
}

export default function TopicsPage() {
  return (
    <ProtectedRoute>
      <AppShell title="Topics" subtitle="All your learning topics">
        <TopicsContent />
      </AppShell>
    </ProtectedRoute>
  );
}
