'use client';

import { useEffect, useState, useCallback } from 'react';
import { ProtectedRoute } from '@/components/providers/protected-route';
import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { SubjectIcon } from '@/components/shared/subject-icon';
import type { Note, Subject, Topic } from '@/types/database';
import { toast } from 'sonner';
import {
  Plus,
  StickyNote,
  Trash2,
  Search as SearchIcon,
} from 'lucide-react';

function NotesContent() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Dialog
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [nts, subs, tops] = await Promise.all([
      supabase
        .from('notes')
        .select('*, subject:subjects(*), topic:topics(*)')
        .order('updated_at', { ascending: false }),
      supabase.from('subjects').select('*').eq('user_id', user.id).order('name'),
      supabase.from('topics').select('*').order('name'),
    ]);
    setNotes((nts.data as Note[]) ?? []);
    setSubjects(subs.data ?? []);
    setAllTopics(tops.data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const availableTopics = allTopics.filter((t) => t.subject_id === subjectId);

  const handleCreate = async () => {
    if (!title.trim() || !user) return;
    setSaving(true);
    const { error } = await supabase.from('notes').insert({
      user_id: user.id,
      subject_id: subjectId || null,
      topic_id: topicId || null,
      title: title.trim(),
      content,
    });
    setSaving(false);
    if (error) {
      toast.error('Could not create note');
    } else {
      toast.success('Note created');
      setTitle('');
      setContent('');
      setSubjectId('');
      setTopicId('');
      setOpen(false);
      loadData();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) {
      toast.error('Could not delete note');
    } else {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      toast.success('Note deleted');
    }
  };

  const filteredNotes = notes.filter((n) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Note
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredNotes.length === 0 ? (
        <EmptyState
          icon={<StickyNote className="w-7 h-7" />}
          title={notes.length === 0 ? 'No notes yet' : 'No notes match your search'}
          description={
            notes.length === 0
              ? 'Create notes from your lecture material to keep everything connected.'
              : 'Try a different search term.'
          }
          action={
            notes.length === 0 ? (
              <Button onClick={() => setOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Note
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setSearch('')}>Clear Search</Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredNotes.map((n) => {
            const subject = subjects.find((s) => s.id === n.subject_id);
            const topic = allTopics.find((t) => t.id === n.topic_id);
            return (
              <Card key={n.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {subject && (
                          <SubjectIcon icon={subject.icon} color={subject.color} size="sm" />
                        )}
                        <p className="text-sm font-medium truncate">{n.title}</p>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                        {n.content || 'No content'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {subject && (
                          <Badge variant="secondary" className="text-[10px]">
                            {subject.code || subject.name}
                          </Badge>
                        )}
                        {topic && (
                          <Badge variant="outline" className="text-[10px]">
                            {topic.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create note dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g. Key takeaways from lecture 3"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="Write your notes here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subject (optional)</Label>
                <Select value={subjectId} onValueChange={(v) => { setSubjectId(v); setTopicId(''); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Topic (optional)</Label>
                <Select value={topicId} onValueChange={setTopicId} disabled={!subjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTopics.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !title.trim()}>
              {saving ? 'Creating...' : 'Create Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function NotesPage() {
  return (
    <ProtectedRoute>
      <AppShell title="Notes" subtitle="Your personal study notes">
        <NotesContent />
      </AppShell>
    </ProtectedRoute>
  );
}
