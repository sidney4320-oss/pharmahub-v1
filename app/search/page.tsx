'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/providers/protected-route';
import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ResourceIcon } from '@/components/shared/resource-icon';
import { SubjectIcon } from '@/components/shared/subject-icon';
import { EmptyState } from '@/components/shared/empty-state';
import { RESOURCE_TYPE_LABELS } from '@/lib/constants';
import type { Subject, Topic, Resource, Note } from '@/types/database';
import {
  Search as SearchIcon,
  FileText,
  StickyNote,
  Library,
  BookOpen,
  ChevronRight,
} from 'lucide-react';

interface SearchResult {
  type: 'resource' | 'note' | 'topic' | 'subject';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  meta?: string;
}

function SearchContent() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const loadData = useCallback(async () => {
    if (!user) return;
    const [subs, tops, ress, nts] = await Promise.all([
      supabase.from('subjects').select('*').eq('user_id', user.id),
      supabase.from('topics').select('*'),
      supabase.from('resources').select('*, subject:subjects(*), topic:topics(*)'),
      supabase.from('notes').select('*, subject:subjects(*), topic:topics(*)'),
    ]);
    setSubjects(subs.data ?? []);
    setTopics(tops.data ?? []);
    setResources((ress.data as Resource[]) ?? []);
    setNotes((nts.data as Note[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();

    const resourceResults: SearchResult[] = resources
      .filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.tags?.some((t) => t.toLowerCase().includes(q)) ||
          r.extracted_text?.toLowerCase().includes(q),
      )
      .map((r) => ({
        type: 'resource' as const,
        id: r.id,
        title: r.title,
        subtitle: r.subject?.name,
        href: `/resources/${r.id}`,
        meta: RESOURCE_TYPE_LABELS[r.resource_type],
      }));

    const noteResults: SearchResult[] = notes
      .filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q),
      )
      .map((n) => ({
        type: 'note' as const,
        id: n.id,
        title: n.title,
        subtitle: n.subject?.name,
        href: '/notes',
        meta: n.content.slice(0, 60),
      }));

    const topicResults: SearchResult[] = topics
      .filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q),
      )
      .map((t) => {
        const subject = subjects.find((s) => s.id === t.subject_id);
        return {
          type: 'topic' as const,
          id: t.id,
          title: t.name,
          subtitle: subject?.name,
          href: `/topics/${t.id}`,
        };
      });

    const subjectResults: SearchResult[] = subjects
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.code?.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q),
      )
      .map((s) => ({
        type: 'subject' as const,
        id: s.id,
        title: s.name,
        subtitle: s.code || undefined,
        href: `/subjects/${s.id}`,
      }));

    return [...resourceResults, ...noteResults, ...topicResults, ...subjectResults];
  }, [query, resources, notes, topics, subjects]);

  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    for (const r of results) {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type].push(r);
    }
    return groups;
  }, [results]);

  const typeMeta: Record<string, { label: string; icon: typeof FileText }> = {
    resource: { label: 'Resources', icon: Library },
    note: { label: 'Notes', icon: StickyNote },
    topic: { label: 'Topics', icon: FileText },
    subject: { label: 'Subjects', icon: BookOpen },
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          id="global-search"
          placeholder="Search across all your materials... (Ctrl+K)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 h-12 text-base"
          autoFocus
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !query.trim() ? (
        <EmptyState
          icon={<SearchIcon className="w-7 h-7" />}
          title="Search everything"
          description="Find resources, notes, topics, and subjects. Search across extracted text, tags, and descriptions."
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon={<SearchIcon className="w-7 h-7" />}
          title={`No results for "${query}"`}
          description="Try a different search term. Search looks through resource titles, descriptions, extracted text, tags, notes, topics, and subjects."
        />
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            {results.length} {results.length === 1 ? 'result' : 'results'} for &quot;{query}&quot;
          </p>
          {Object.entries(grouped).map(([type, items]) => {
            const meta = typeMeta[type];
            if (!meta || items.length === 0) return null;
            const Icon = meta.icon;
            return (
              <div key={type} className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Icon className="w-4 h-4" />
                  {meta.label}
                  <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
                </div>
                {items.map((r) => (
                  <Link key={`${r.type}-${r.id}`} href={r.href}>
                    <Card className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {r.type === 'resource' && (
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary text-muted-foreground shrink-0">
                              <ResourceIcon type="lecture_notes" size={16} />
                            </div>
                          )}
                          {r.type === 'subject' && (
                            <SubjectIcon icon="BookOpen" color="#0d9488" size="sm" />
                          )}
                          {(r.type === 'note' || r.type === 'topic') && (
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary text-muted-foreground shrink-0">
                              <Icon className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{r.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {r.subtitle || r.meta}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <ProtectedRoute>
      <AppShell title="Search" subtitle="Find anything across your materials">
        <SearchContent />
      </AppShell>
    </ProtectedRoute>
  );
}
