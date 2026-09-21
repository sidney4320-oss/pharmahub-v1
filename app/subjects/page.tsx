'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/providers/protected-route';
import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SubjectIcon } from '@/components/shared/subject-icon';
import { ProgressBadge } from '@/components/shared/progress-badge';
import { EmptyState } from '@/components/shared/empty-state';
import type { Subject, Topic, Resource } from '@/types/database';
import { BookOpen, Plus, ArrowRight, FileText, Library } from 'lucide-react';

function SubjectsContent() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: subs } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (subs && subs.length > 0) {
        const { data: tops } = await supabase
          .from('topics')
          .select('*')
          .in('subject_id', subs.map((s) => s.id));
        const { data: ress } = await supabase
          .from('resources')
          .select('*')
          .in('subject_id', subs.map((s) => s.id));
        setTopics(tops ?? []);
        setResources(ress ?? []);
      }
      setSubjects(subs ?? []);
      setLoading(false);
    })();
  }, [user]);

  const getSubjectStats = (subjectId: string) => {
    const subTopics = topics.filter((t) => t.subject_id === subjectId);
    const done = subTopics.filter(
      (t) => t.status === 'understood' || t.status === 'mastered',
    ).length;
    const total = subTopics.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const resCount = resources.filter((r) => r.subject_id === subjectId).length;
    return { total, done, pct, resCount };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {subjects.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-7 h-7" />}
          title="No subjects yet"
          description="Your pharmacy subjects will appear here once you create your account."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => {
            const stats = getSubjectStats(subject.id);
            return (
              <Link key={subject.id} href={`/subjects/${subject.id}`}>
                <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <SubjectIcon icon={subject.icon} color={subject.color} size="lg" />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm leading-tight line-clamp-2">
                          {subject.name}
                        </h3>
                        {subject.code && (
                          <p className="text-xs text-muted-foreground mt-1">{subject.code}</p>
                        )}
                      </div>
                    </div>

                    {subject.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                        {subject.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {stats.total} topics
                      </span>
                      <span className="flex items-center gap-1">
                        <Library className="w-3.5 h-3.5" />
                        {stats.resCount} resources
                      </span>
                    </div>

                    <ProgressBadge value={stats.pct} />

                    <div className="flex items-center justify-end mt-3">
                      <span className="text-xs text-primary font-medium flex items-center gap-1">
                        Open <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SubjectsPage() {
  return (
    <ProtectedRoute>
      <AppShell title="Subjects" subtitle="Your pharmacy curriculum">
        <SubjectsContent />
      </AppShell>
    </ProtectedRoute>
  );
}
