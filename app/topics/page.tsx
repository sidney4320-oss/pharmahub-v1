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
import { FileText, ChevronRight, BookOpen } from 'lucide-react';

interface TopicWithSubject extends Topic {
  subject: Subject;
}

function TopicsContent() {
  const { user } = useAuth();
  const [topics, setTopics] = useState<TopicWithSubject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: subs } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id);

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

  return (
    <div className="max-w-4xl mx-auto space-y-4">
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
      ) : (
        <div className="space-y-2">
          {topics.map((topic) => (
            <Link key={topic.id} href={`/topics/${topic.id}`}>
              <Card className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <SubjectIcon icon={topic.subject.icon} color={topic.subject.color} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{topic.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {topic.subject.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${TOPIC_STATUS_COLORS[topic.status]}`} />
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {TOPIC_STATUS_LABELS[topic.status]}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
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
