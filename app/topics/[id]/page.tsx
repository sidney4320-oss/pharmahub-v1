'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/providers/protected-route';
import { AppShell } from '@/components/layout/app-shell';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SubjectIcon } from '@/components/shared/subject-icon';
import { ResourceIcon } from '@/components/shared/resource-icon';
import { EmptyState } from '@/components/shared/empty-state';
import { ProgressBadge } from '@/components/shared/progress-badge';
import {
  RESOURCE_TYPE_LABELS,
  TOPIC_STATUS_LABELS,
  TOPIC_STATUS_COLORS,
} from '@/lib/constants';
import type { Topic, Subject, Resource, Note, Flashcard, Concept } from '@/types/database';
import { toast } from 'sonner';
import {
  ArrowLeft,
  FileText,
  Library,
  StickyNote,
  Upload,
  ChevronRight,
  Plus,
  Brain,
  HelpCircle,
  Layers,
  BookOpen,
  Trash2,
} from 'lucide-react';

type TopicStatus = Topic['status'];

interface TopicFull extends Topic {
  subject: Subject;
}

function TopicDetailContent() {
  const params = useParams();
  const { user } = useAuth();
  const topicId = params.id as string;

  const [topic, setTopic] = useState<TopicFull | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);

  // Note dialog
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Flashcard dialog
  const [fcOpen, setFcOpen] = useState(false);
  const [fcFront, setFcFront] = useState('');
  const [fcBack, setFcBack] = useState('');
  const [savingFc, setSavingFc] = useState(false);

  // Concept dialog
  const [conceptOpen, setConceptOpen] = useState(false);
  const [conceptName, setConceptName] = useState('');
  const [conceptDesc, setConceptDesc] = useState('');
  const [savingConcept, setSavingConcept] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    const { data: top } = await supabase
      .from('topics')
      .select('*, subject:subjects(*)')
      .eq('id', topicId)
      .maybeSingle();
    setTopic(top as TopicFull | null);

    if (top) {
      const [ress, nts, fcs, cpts] = await Promise.all([
        supabase
          .from('resources')
          .select('*')
          .eq('topic_id', topicId)
          .order('created_at', { ascending: false }),
        supabase
          .from('notes')
          .select('*')
          .eq('topic_id', topicId)
          .order('updated_at', { ascending: false }),
        supabase
          .from('flashcards')
          .select('*')
          .eq('topic_id', topicId)
          .order('created_at', { ascending: false }),
        supabase
          .from('concepts')
          .select('*')
          .eq('topic_id', topicId)
          .order('created_at'),
      ]);

      setResources((ress.data as Resource[]) ?? []);
      setNotes((nts.data as Note[]) ?? []);
      setFlashcards((fcs.data as Flashcard[]) ?? []);
      setConcepts((cpts.data as Concept[]) ?? []);
    }
    setLoading(false);
  }, [user, topicId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (status: TopicStatus) => {
    if (!topic) return;
    const { error } = await supabase.from('topics').update({ status }).eq('id', topic.id);
    if (error) {
      toast.error('Could not update status');
    } else {
      setTopic({ ...topic, status });
      toast.success('Status updated');
    }
  };

  const handleAddNote = async () => {
    if (!noteTitle.trim() || !topic || !user) return;
    setSavingNote(true);
    const { error } = await supabase.from('notes').insert({
      user_id: user.id,
      subject_id: topic.subject_id,
      topic_id: topic.id,
      title: noteTitle.trim(),
      content: noteContent,
    });
    setSavingNote(false);
    if (error) {
      toast.error('Could not create note');
    } else {
      toast.success('Note created');
      setNoteTitle('');
      setNoteContent('');
      setNoteOpen(false);
      loadData();
    }
  };

  const handleAddFlashcard = async () => {
    if (!fcFront.trim() || !topic || !user) return;
    setSavingFc(true);
    const { error } = await supabase.from('flashcards').insert({
      user_id: user.id,
      subject_id: topic.subject_id,
      topic_id: topic.id,
      front: fcFront.trim(),
      back: fcBack.trim(),
    });
    setSavingFc(false);
    if (error) {
      toast.error('Could not create flashcard');
    } else {
      toast.success('Flashcard added');
      setFcFront('');
      setFcBack('');
      setFcOpen(false);
      loadData();
    }
  };

  const handleAddConcept = async () => {
    if (!conceptName.trim() || !topic || !user) return;
    setSavingConcept(true);
    const { error } = await supabase.from('concepts').insert({
      user_id: user.id,
      topic_id: topic.id,
      name: conceptName.trim(),
      description: conceptDesc.trim() || null,
    });
    setSavingConcept(false);
    if (error) {
      toast.error('Could not create concept');
    } else {
      toast.success('Concept added');
      setConceptName('');
      setConceptDesc('');
      setConceptOpen(false);
      loadData();
    }
  };

  const handleDeleteNote = async (id: string) => {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) {
      toast.error('Could not delete note');
    } else {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      toast.success('Note deleted');
    }
  };

  const handleDeleteFlashcard = async (id: string) => {
    const { error } = await supabase.from('flashcards').delete().eq('id', id);
    if (error) {
      toast.error('Could not delete flashcard');
    } else {
      setFlashcards((prev) => prev.filter((f) => f.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!topic) {
    return (
      <EmptyState
        title="Topic not found"
        description="This topic may have been deleted."
        action={
          <Link href="/topics">
            <Button variant="outline">Back to Topics</Button>
          </Link>
        }
      />
    );
  }

  const doneConcepts = concepts.filter(
    (c) => c.status === 'understood' || c.status === 'mastered',
  ).length;
  const conceptProgress =
    concepts.length > 0 ? Math.round((doneConcepts / concepts.length) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link
        href={`/subjects/${topic.subject_id}`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {topic.subject.name}
      </Link>

      {/* Topic header */}
      <Card>
        <CardContent className="p-5 lg:p-6">
          <div className="flex items-start gap-4">
            <SubjectIcon icon={topic.subject.icon} color={topic.subject.color} size="lg" />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg lg:text-xl font-bold leading-tight">{topic.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">{topic.subject.name}</p>
              {topic.description && (
                <p className="text-sm text-muted-foreground mt-3">{topic.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Select value={topic.status} onValueChange={(v) => handleStatusChange(v as TopicStatus)}>
                  <SelectTrigger className="w-[150px] h-9">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${TOPIC_STATUS_COLORS[topic.status]}`} />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TOPIC_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Link href={`/study?topic=${topic.id}`}>
                  <Button size="sm" variant="outline">
                    <Brain className="w-4 h-4 mr-1.5" />
                    Study
                  </Button>
                </Link>
                <Link href={`/quizzes?topic=${topic.id}`}>
                  <Button size="sm" variant="outline">
                    <HelpCircle className="w-4 h-4 mr-1.5" />
                    Quiz
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="resources">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="resources" className="flex items-center gap-1.5">
            <Library className="w-4 h-4" />
            Resources
            <Badge variant="secondary" className="ml-1">{resources.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-1.5">
            <StickyNote className="w-4 h-4" />
            Notes
            <Badge variant="secondary" className="ml-1">{notes.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="flashcards" className="flex items-center gap-1.5">
            <Layers className="w-4 h-4" />
            Flashcards
            <Badge variant="secondary" className="ml-1">{flashcards.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="concepts" className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" />
            Concepts
            <Badge variant="secondary" className="ml-1">{concepts.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Resources */}
        <TabsContent value="resources" className="space-y-3">
          {resources.length === 0 ? (
            <EmptyState
              icon={<Library className="w-7 h-7" />}
              title="No resources for this topic"
              description="Upload lecture notes, PDFs, or images and link them to this topic."
              action={
                <Link href={`/library?topic=${topic.id}`}>
                  <Button size="sm">
                    <Upload className="w-4 h-4 mr-1.5" />
                    Upload
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-2">
              {resources.map((r) => (
                <Link key={r.id} href={`/resources/${r.id}`}>
                  <Card className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-secondary text-muted-foreground">
                          <ResourceIcon type={r.resource_type} mimeType={r.mime_type} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{r.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {RESOURCE_TYPE_LABELS[r.resource_type]}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Notes</h3>
            <Button size="sm" onClick={() => setNoteOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Note
            </Button>
          </div>
          {notes.length === 0 ? (
            <EmptyState
              icon={<StickyNote className="w-7 h-7" />}
              title="No notes yet"
              description="Create notes from your lecture material to keep everything connected."
              action={
                <Button size="sm" onClick={() => setNoteOpen(true)}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create Note
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {notes.map((n) => (
                <Card key={n.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">
                          {n.content}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteNote(n.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Flashcards */}
        <TabsContent value="flashcards" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Flashcards</h3>
            <Button size="sm" onClick={() => setFcOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Flashcard
            </Button>
          </div>
          {flashcards.length === 0 ? (
            <EmptyState
              icon={<Layers className="w-7 h-7" />}
              title="No flashcards yet"
              description="Create flashcards to test your knowledge of this topic."
              action={
                <Button size="sm" onClick={() => setFcOpen(true)}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Flashcard
                </Button>
              }
            />
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {flashcards.map((fc) => (
                <Card key={fc.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Front</p>
                        <p className="text-sm font-medium">{fc.front}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mt-3 mb-1">Back</p>
                        <p className="text-sm text-muted-foreground">{fc.back}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteFlashcard(fc.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Concepts */}
        <TabsContent value="concepts" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Concepts</h3>
            <Button size="sm" onClick={() => setConceptOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Concept
            </Button>
          </div>
          {concepts.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-7 h-7" />}
              title="No concepts yet"
              description="Break this topic down into key concepts to build your understanding."
              action={
                <Button size="sm" onClick={() => setConceptOpen(true)}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Concept
                </Button>
              }
            />
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs text-muted-foreground">Understanding</span>
                <ProgressBadge value={conceptProgress} showLabel={false} className="flex-1" />
                <span className="text-xs font-medium">{conceptProgress}%</span>
              </div>
              <div className="space-y-2">
                {concepts.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{c.name}</p>
                        {c.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                        )}
                      </div>
                      <div className={`w-2.5 h-2.5 rounded-full ${TOPIC_STATUS_COLORS[c.status]} shrink-0`} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Note dialog */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note — {topic.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="noteTitle">Title</Label>
              <Input
                id="noteTitle"
                placeholder="e.g. Key takeaways from lecture 3"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="noteContent">Content</Label>
              <Textarea
                id="noteContent"
                placeholder="Write your notes here..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteOpen(false)}>Cancel</Button>
            <Button onClick={handleAddNote} disabled={savingNote || !noteTitle.trim()}>
              {savingNote ? 'Creating...' : 'Create Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flashcard dialog */}
      <Dialog open={fcOpen} onOpenChange={setFcOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Flashcard — {topic.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="fcFront">Front (question)</Label>
              <Textarea
                id="fcFront"
                placeholder="e.g. What is the function of the cell membrane?"
                value={fcFront}
                onChange={(e) => setFcFront(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fcBack">Back (answer)</Label>
              <Textarea
                id="fcBack"
                placeholder="e.g. It regulates what enters and exits the cell..."
                value={fcBack}
                onChange={(e) => setFcBack(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFcOpen(false)}>Cancel</Button>
            <Button onClick={handleAddFlashcard} disabled={savingFc || !fcFront.trim()}>
              {savingFc ? 'Adding...' : 'Add Flashcard'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Concept dialog */}
      <Dialog open={conceptOpen} onOpenChange={setConceptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Concept — {topic.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="conceptName">Concept name</Label>
              <Input
                id="conceptName"
                placeholder="e.g. Cell membrane, Actin, ATP..."
                value={conceptName}
                onChange={(e) => setConceptName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conceptDesc">Description (optional)</Label>
              <Textarea
                id="conceptDesc"
                placeholder="Brief explanation of this concept..."
                value={conceptDesc}
                onChange={(e) => setConceptDesc(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConceptOpen(false)}>Cancel</Button>
            <Button onClick={handleAddConcept} disabled={savingConcept || !conceptName.trim()}>
              {savingConcept ? 'Adding...' : 'Add Concept'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TopicDetailPage() {
  return (
    <ProtectedRoute>
      <AppShell title="Topic">
        <TopicDetailContent />
      </AppShell>
    </ProtectedRoute>
  );
}
