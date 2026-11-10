'use client';

import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RESOURCE_TYPE_LABELS, RESOURCE_TYPES, MAX_FILE_SIZE, ACCEPTED_FILE_EXTENSIONS } from '@/lib/constants';
import { extractTextFromFile, formatFileSize } from '@/lib/text-extract';
import type { Subject, Topic, ResourceType } from '@/types/database';
import { toast } from 'sonner';
import { Upload, X, Loader2, Image as ImageIcon, FileText } from 'lucide-react';

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
  topics: Topic[];
  defaultSubjectId?: string;
  defaultTopicId?: string;
  onUploaded?: () => void;
}

const VALID_EXTENSIONS = new Set(['pdf', 'png', 'jpg', 'jpeg', 'webp', 'txt', 'doc', 'docx']);

export function UploadDialog({ open, onOpenChange, subjects, topics, defaultSubjectId, defaultTopicId, onUploaded }: UploadDialogProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState(defaultSubjectId || '');
  const [topicId, setTopicId] = useState(defaultTopicId || '');
  const [resourceType, setResourceType] = useState<ResourceType>('lecture_notes');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const availableTopics = topics.filter((topic) => topic.subject_id === subjectId);

  const reset = () => {
    setFile(null);
    setTitle('');
    setDescription('');
    setSubjectId(defaultSubjectId || '');
    setTopicId(defaultTopicId || '');
    setResourceType('lecture_notes');
    setTags('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = useCallback((selectedFile: File | null | undefined) => {
    if (!selectedFile) {
      toast.error('The selected file could not be read. Please choose it again.');
      return;
    }
    if (typeof selectedFile.name !== 'string' || !selectedFile.name.trim() || !Number.isFinite(selectedFile.size) || selectedFile.size <= 0) {
      toast.error('This file appears to be empty or unavailable. Please choose a valid file.');
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error(`File is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`);
      return;
    }
    const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';
    if (!VALID_EXTENSIONS.has(ext)) {
      toast.error(ext ? `File type ".${ext}" is not supported.` : 'This file type is not supported.');
      return;
    }
    setFile(selectedFile);
    setTitle((previous) => previous || selectedFile.name.replace(/\.[^/.]+$/, ''));
    if (selectedFile.type?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(ext)) setResourceType('image');
    else if (ext === 'pdf') setResourceType('lecture_notes');
  }, []);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    handleFileSelect(event.dataTransfer?.files?.[0]);
  };

  const handleUpload = async () => {
    if (!file || !user || !subjectId) {
      toast.error('Please select a valid file and subject.');
      return;
    }
    if (!file.name || !Number.isFinite(file.size) || file.size <= 0 || typeof file.slice !== 'function') {
      toast.error('The selected file is no longer available. Please select it again.');
      setFile(null);
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'file';
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('resources').upload(fileName, file);
      if (uploadError) {
        toast.error('Could not upload file. Please check the file and try again.');
        return;
      }

      let extractedText: string | null = null;
      let extractionStatus: 'pending' | 'extracted' | 'failed' | 'not_applicable' = 'pending';
      try {
        const extraction = await extractTextFromFile(file);
        extractedText = extraction.text || null;
        extractionStatus = extraction.status;
      } catch {
        extractionStatus = 'failed';
      }

      const tagArray = tags.split(',').map((tag) => tag.trim()).filter(Boolean);
      const { error: dbError } = await supabase.from('resources').insert({
        user_id: user.id,
        subject_id: subjectId,
        topic_id: topicId || null,
        title: title.trim() || file.name,
        description: description.trim() || null,
        resource_type: resourceType,
        file_path: fileName,
        file_url: fileName,
        mime_type: file.type || 'application/octet-stream',
        file_size: file.size,
        extracted_text: extractedText,
        extraction_status: extractionStatus,
        tags: tagArray,
        semester: subjects.find((subject) => subject.id === subjectId)?.semester ?? 1,
      });
      if (dbError) {
        toast.error('File uploaded but could not save to library. Please try again.');
        return;
      }
      toast.success(extractionStatus === 'failed'
        ? 'Resource uploaded, but its text could not be read.'
        : 'Resource uploaded successfully');
      reset();
      onOpenChange(false);
      onUploaded?.();
    } catch {
      toast.error('Something went wrong during upload. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>Upload Resource</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          {!file ? (
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click(); }}
              onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground"><Upload className="h-6 w-6" /></div>
                <p className="text-sm font-medium">Click to upload or drag &amp; drop</p>
                <p className="text-xs text-muted-foreground">PDF, PNG, JPG, WEBP, TXT, DOC — max {formatFileSize(MAX_FILE_SIZE)}</p>
              </div>
              <input ref={fileInputRef} type="file" accept={ACCEPTED_FILE_EXTENSIONS} className="hidden" onChange={(event) => handleFileSelect(event.currentTarget.files?.[0])} />
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground">{file.type?.startsWith('image/') ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}</div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.name || 'Selected file'}</p><p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p></div>
              <button type="button" aria-label="Remove selected file" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
          )}
          {file && <>
            <div className="space-y-2"><Label htmlFor="title">Title</Label><Input id="title" placeholder="Resource title" value={title} onChange={(event) => setTitle(event.target.value)} /></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Subject</Label><Select value={subjectId} onValueChange={(value) => { setSubjectId(value); setTopicId(''); }}><SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger><SelectContent>{subjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Topic (optional)</Label><Select value={topicId} onValueChange={setTopicId} disabled={!subjectId}><SelectTrigger><SelectValue placeholder="Select topic" /></SelectTrigger><SelectContent>{availableTopics.map((topic) => <SelectItem key={topic.id} value={topic.id}>{topic.name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Resource type</Label><Select value={resourceType} onValueChange={(value) => setResourceType(value as ResourceType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RESOURCE_TYPES.map((type) => <SelectItem key={type} value={type}>{RESOURCE_TYPE_LABELS[type]}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="description">Description (optional)</Label><Textarea id="description" placeholder="What is this resource about?" value={description} onChange={(event) => setDescription(event.target.value)} rows={2} /></div>
            <div className="space-y-2"><Label htmlFor="tags">Tags (comma-separated)</Label><Input id="tags" placeholder="e.g. exam, revision, important" value={tags} onChange={(event) => setTags(event.target.value)} /></div>
          </>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleUpload} disabled={uploading || !file || !subjectId}>{uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</> : <><Upload className="mr-2 h-4 w-4" />Upload</>}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
