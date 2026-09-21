'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/providers/protected-route';
import { AppShell } from '@/components/layout/app-shell';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ResourceIcon } from '@/components/shared/resource-icon';
import { SubjectIcon } from '@/components/shared/subject-icon';
import { EmptyState } from '@/components/shared/empty-state';
import { RESOURCE_TYPE_LABELS } from '@/lib/constants';
import { isImageFile, isPdfFile, formatFileSize as fmtSize } from '@/lib/text-extract';
import { aiService } from '@/lib/ai-service';
import type { Resource, Subject, Topic, Note } from '@/types/database';
import { toast } from 'sonner';
import {
  ArrowLeft,
  FileText,
  StickyNote,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  Brain,
  HelpCircle,
  Layers,
  ExternalLink,
} from 'lucide-react';

interface ResourceFull extends Resource {
  subject: Subject;
  topic: Topic | null;
}

function ResourceDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const resourceId = params.id as string;

  const [resource, setResource] = useState<ResourceFull | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  // Note dialog
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // AI states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    const { data: res } = await supabase
      .from('resources')
      .select('*, subject:subjects(*), topic:topics(*)')
      .eq('id', resourceId)
      .maybeSingle();
    setResource(res as ResourceFull | null);

    if (res) {
      const { data: nts } = await supabase
        .from('notes')
        .select('*')
        .eq('resource_id', resourceId)
        .order('updated_at', { ascending: false });
      setNotes((nts as Note[]) ?? []);

      // Get signed URL for the file
      if (res.file_path) {
        const { data: urlData } = await supabase.storage
          .from('resources')
          .createSignedUrl(res.file_path, 3600);
        if (urlData?.signedUrl) setSignedUrl(urlData.signedUrl);
      }
    }
    setLoading(false);
  }, [user, resourceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddNote = async () => {
    if (!noteTitle.trim() || !resource || !user) return;
    setSavingNote(true);
    const { error } = await supabase.from('notes').insert({
      user_id: user.id,
      subject_id: resource.subject_id,
      topic_id: resource.topic_id,
      resource_id: resource.id,
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

  const handleDeleteNote = async (id: string) => {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) {
      toast.error('Could not delete note');
    } else {
      setNotes((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const handleDeleteResource = async () => {
    if (!resource) return;
    if (resource.file_path) {
      await supabase.storage.from('resources').remove([resource.file_path]);
    }
    const { error } = await supabase.from('resources').delete().eq('id', resource.id);
    if (error) {
      toast.error('Could not delete resource');
    } else {
      toast.success('Resource deleted');
      router.push('/library');
    }
  };

  const handleAISummarize = async () => {
    if (!resource?.extracted_text) {
      toast.error('No extracted text available for this resource. AI features require text content.');
      return;
    }
    if (!aiService.isAvailable()) {
      toast.error('AI features are not configured yet. This is an integration point for future AI support.');
      return;
    }
    setAiLoading(true);
    const result = await aiService.generateSummary(resource.extracted_text, resource.title);
    setAiLoading(false);
    if (result) {
      setAiResult(result.summary);
    } else {
      toast.error('AI could not generate a summary. Please try again later.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!resource) {
    return (
      <EmptyState
        title="Resource not found"
        description="This resource may have been deleted."
        action={
          <Link href="/library">
            <Button variant="outline">Back to Library</Button>
          </Link>
        }
      />
    );
  }

  const isImage = isImageFile(resource.mime_type || '');
  const isPdf = isPdfFile(resource.mime_type || '');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link
        href={`/subjects/${resource.subject_id}`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {resource.subject?.name}
      </Link>

      {/* Resource header */}
      <Card>
        <CardContent className="p-5 lg:p-6">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-secondary text-muted-foreground shrink-0">
              <ResourceIcon type={resource.resource_type} mimeType={resource.mime_type} size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg lg:text-xl font-bold leading-tight">{resource.title}</h1>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                <span>{RESOURCE_TYPE_LABELS[resource.resource_type]}</span>
                <span>· {fmtSize(resource.file_size)}</span>
                <span>· {new Date(resource.created_at).toLocaleDateString()}</span>
              </div>
              {resource.description && (
                <p className="text-sm text-muted-foreground mt-3">{resource.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-4">
                {signedUrl && (
                  <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm">
                      <ExternalLink className="w-4 h-4 mr-1.5" />
                      Open File
                    </Button>
                  </a>
                )}
                {resource.topic && (
                  <Link href={`/topics/${resource.topic.id}`}>
                    <Button size="sm" variant="outline">
                      <FileText className="w-4 h-4 mr-1.5" />
                      {resource.topic.name}
                    </Button>
                  </Link>
                )}
                <Button size="sm" variant="outline" onClick={handleDeleteResource}>
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Delete
                </Button>
              </div>

              {resource.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {resource.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="preview">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="text">Extracted Text</TabsTrigger>
          <TabsTrigger value="ai">AI Tools</TabsTrigger>
          <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
        </TabsList>

        {/* Preview */}
        <TabsContent value="preview" className="space-y-3">
          <Card>
            <CardContent className="p-4">
              {isImage && signedUrl ? (
                <div className="flex justify-center">
                  <img
                    src={signedUrl}
                    alt={resource.title}
                    className="max-w-full rounded-lg border"
                  />
                </div>
              ) : isPdf && signedUrl ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">
                    PDF preview is available in a new tab.
                  </p>
                  <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                    <Button>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open PDF
                    </Button>
                  </a>
                </div>
              ) : signedUrl ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mb-3" />
                  <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                    <Button>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open File
                    </Button>
                  </a>
                </div>
              ) : (
                <EmptyState
                  icon={<FileText className="w-7 h-7" />}
                  title="No file preview available"
                  description="The file could not be loaded for preview."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Extracted text */}
        <TabsContent value="text" className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Extracted Text</CardTitle>
            </CardHeader>
            <CardContent>
              {resource.extracted_text ? (
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans">
                    {resource.extracted_text}
                  </pre>
                </div>
              ) : (
                <EmptyState
                  icon={<FileText className="w-7 h-7" />}
                  title={
                    resource.extraction_status === 'pending'
                      ? 'Text extraction in progress'
                      : 'No extracted text'
                  }
                  description={
                    resource.extraction_status === 'pending'
                      ? 'Text is being extracted from this file. Check back later.'
                      : 'Text could not be extracted from this file. For images, OCR support is an integration point for future enhancement.'
                  }
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI tools */}
        <TabsContent value="ai" className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                AI Study Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!aiService.isAvailable() && (
                <div className="bg-secondary/50 rounded-lg p-4 text-sm text-muted-foreground">
                  AI features are not configured yet. These are integration points — once an AI provider is connected, you&apos;ll be able to generate summaries, flashcards, and quizzes from your uploaded materials.
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={handleAISummarize}
                  disabled={aiLoading || !resource.extracted_text}
                  className="justify-start"
                >
                  {aiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Generate Summary
                </Button>
                <Button variant="outline" disabled={!aiService.isAvailable()} className="justify-start">
                  <Layers className="w-4 h-4 mr-2" />
                  Generate Flashcards
                </Button>
                <Button variant="outline" disabled={!aiService.isAvailable()} className="justify-start">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Generate Quiz
                </Button>
                <Button variant="outline" disabled={!aiService.isAvailable()} className="justify-start">
                  <Brain className="w-4 h-4 mr-2" />
                  Explain This
                </Button>
              </div>

              {aiResult && (
                <div className="bg-secondary/50 rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">Summary</p>
                  <p className="text-sm text-muted-foreground">{aiResult}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Notes from this resource</h3>
            <Button size="sm" onClick={() => setNoteOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Note
            </Button>
          </div>
          {notes.length === 0 ? (
            <EmptyState
              icon={<StickyNote className="w-7 h-7" />}
              title="No notes for this resource"
              description="Create notes from this material to keep your insights connected."
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
      </Tabs>

      {/* Note dialog */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note — {resource.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="noteTitle">Title</Label>
              <Input
                id="noteTitle"
                placeholder="e.g. Key points from this lecture"
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
    </div>
  );
}

export default function ResourceDetailPage() {
  return (
    <ProtectedRoute>
      <AppShell title="Resource">
        <ResourceDetailContent />
      </AppShell>
    </ProtectedRoute>
  );
}
