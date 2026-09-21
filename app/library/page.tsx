'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/providers/protected-route';
import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UploadDialog } from '@/components/shared/upload-dialog';
import { ResourceIcon } from '@/components/shared/resource-icon';
import { EmptyState } from '@/components/shared/empty-state';
import { RESOURCE_TYPE_LABELS, RESOURCE_TYPES } from '@/lib/constants';
import { formatFileSize } from '@/lib/text-extract';
import type { Subject, Topic, Resource } from '@/types/database';
import { Upload, Library, ChevronRight, Search as SearchIcon } from 'lucide-react';

function LibraryContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialSubject = searchParams.get('subject') || '';
  const initialTopic = searchParams.get('topic') || '';

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState(initialSubject || 'all');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');

  const loadData = useCallback(async () => {
    if (!user) return;
    const [subs, tops] = await Promise.all([
      supabase.from('subjects').select('*').eq('user_id', user.id).order('name'),
      supabase.from('topics').select('*').order('name'),
    ]);
    setSubjects(subs.data ?? []);
    setAllTopics(tops.data ?? []);

    let q = supabase
      .from('resources')
      .select('*, subject:subjects(*), topic:topics(*)')
      .order('created_at', { ascending: false });
    if (initialSubject) q = q.eq('subject_id', initialSubject);
    if (initialTopic) q = q.eq('topic_id', initialTopic);
    const { data: ress } = await q;
    setResources((ress as Resource[]) ?? []);
    setLoading(false);
  }, [user, initialSubject, initialTopic]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredResources = useMemo(() => {
    let result = resources;

    if (filterSubject !== 'all') {
      result = result.filter((r) => r.subject_id === filterSubject);
    }
    if (filterType !== 'all') {
      result = result.filter((r) => r.resource_type === filterType);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.tags?.some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (sortBy === 'title') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    }
    return result;
  }, [resources, filterSubject, filterType, search, sortBy]);

  const availableTopics = allTopics.filter((t) => t.subject_id === filterSubject || filterSubject === 'all');

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header + upload */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {filteredResources.length} {filteredResources.length === 1 ? 'resource' : 'resources'}
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {RESOURCE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {RESOURCE_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Resource list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredResources.length === 0 ? (
        <EmptyState
          icon={<Library className="w-7 h-7" />}
          title={resources.length === 0 ? 'Your learning library is empty' : 'No resources match your filters'}
          description={
            resources.length === 0
              ? 'Upload your first lecture note, PDF, or image to get started.'
              : 'Try adjusting your search or filters.'
          }
          action={
            resources.length === 0 ? (
              <Button onClick={() => setUploadOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Resource
              </Button>
            ) : (
              <Button variant="outline" onClick={() => { setSearch(''); setFilterSubject('all'); setFilterType('all'); }}>
                Clear Filters
              </Button>
            )
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((r) => {
            const subject = subjects.find((s) => s.id === r.subject_id);
            const topic = allTopics.find((t) => t.id === r.topic_id);
            return (
              <Link key={r.id} href={`/resources/${r.id}`}>
                <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer h-full">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary text-muted-foreground shrink-0">
                        <ResourceIcon type={r.resource_type} mimeType={r.mime_type} size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{r.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {RESOURCE_TYPE_LABELS[r.resource_type]} · {formatFileSize(r.file_size)}
                        </p>
                      </div>
                    </div>

                    {r.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                        {r.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {subject && (
                          <Badge variant="secondary" className="text-[10px] truncate max-w-[140px]">
                            {subject.code || subject.name}
                          </Badge>
                        )}
                        {topic && (
                          <Badge variant="outline" className="text-[10px] truncate max-w-[100px]">
                            {topic.name}
                          </Badge>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>

                    {r.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {r.tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="text-[10px] text-muted-foreground">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        subjects={subjects}
        topics={availableTopics}
        defaultSubjectId={initialSubject || undefined}
        defaultTopicId={initialTopic || undefined}
        onUploaded={loadData}
      />
    </div>
  );
}

export default function LibraryPage() {
  return (
    <ProtectedRoute>
      <AppShell title="Library" subtitle="Your learning materials">
        <LibraryContent />
      </AppShell>
    </ProtectedRoute>
  );
}
