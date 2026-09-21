'use client';

import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { RESOURCE_TYPE_LABELS, RESOURCE_TYPES, MAX_FILE_SIZE, ACCEPTED_FILE_EXTENSIONS } from '@/lib/constants';
import { extractTextFromFile, formatFileSize } from '@/lib/text-extract';
import type { Subject, Topic, ResourceType } from '@/types/database';
import { toast } from 'sonner';
import { Upload, File as FileIcon, X, Loader2, Image as ImageIcon, FileText } from 'lucide-react';

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
  topics: Topic[];
  defaultSubjectId?: string;
  defaultTopicId?: string;
  onUploaded?: () => void;
}

export function UploadDialog({
  open,
  onOpenChange,
  subjects,
  topics,
  defaultSubjectId,
  defaultTopicId,
  onUploaded,
}: UploadDialogProps) {
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

  const availableTopics = topics.filter((t) => t.subject_id === subjectId);

  const reset = () => {
    setFile(null);
    setTitle('');
    setDescription('');
    setSubjectId(defaultSubjectId || '');
    setTopicId(defaultTopicId || '');
    setResourceType('lecture_notes');
    setTags('');
  };

  const handleFileSelect = useCallback((selectedFile: File | null) => {
    if (!selectedFile) return;
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error(`File is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`);
      return;
    }
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'txt', 'doc', 'docx'];
    if (ext && !validExtensions.includes(ext)) {
      toast.error(`File type ".${ext}" is not supported.`);
      return;
    }
    setFile(selectedFile);
    if (!title) {
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
    }
    // Auto-detect resource type for images
    if (selectedFile.type.startsWith('image/')) {
      setResourceType('image');
    } else if (ext === 'pdf') {
      setResourceType('lecture_notes');
    }
  }, [title]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  };

  const handleUpload = async () => {
    if (!file || !user || !subjectId) {
      toast.error('Please select a file and subject');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'file';
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(fileName, file);

      if (uploadError) {
        toast.error('Could not upload file. Please try again.');
        setUploading(false);
        return;
      }

      // Extract text
      let extractedText: string | null = null;
      let extractionStatus: 'pending' | 'extracted' | 'failed' | 'not_applicable' = 'pending';
      try {
        const extraction = await extractTextFromFile(file);
        extractedText = extraction.text || null;
        extractionStatus = extraction.status;
      } catch {
        extractionStatus = 'failed';
      }

      const tagArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const { error: dbError } = await supabase.from('resources').insert({
        user_id: user.id,
        subject_id: subjectId,
        topic_id: topicId || null,
        title: title.trim() || file.name,
        description: description.trim() || null,
        resource_type: resourceType,
        file_path: fileName,
        file_url: fileName,
        mime_type: file.type,
        file_size: file.size,
        extracted_text: extractedText,
        extraction_status: extractionStatus,
        tags: tagArray,
        semester: subjects.find((s) => s.id === subjectId)?.semester ?? 1,
      });

      if (dbError) {
        toast.error('File uploaded but could not save to library. Please try again.');
      } else {
        toast.success('Resource uploaded successfully');
        reset();
        onOpenChange(false);
        onUploaded?.();
      }
    } catch {
      toast.error('Something went wrong during upload.');
    }
    setUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Resource</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* File drop zone */}
          {!file ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-secondary text-muted-foreground">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium">Click to upload or drag & drop</p>
                <p className="text-xs text-muted-foreground">
                  PDF, PNG, JPG, WEBP, TXT, DOC — max {formatFileSize(MAX_FILE_SIZE)}
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FILE_EXTENSIONS}
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              />
            </div>
          ) : (
            <div className="border rounded-lg p-4 flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary text-muted-foreground">
                {file.type.startsWith('image/') ? (
                  <ImageIcon className="w-5 h-5" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
              <button
                onClick={() => setFile(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {file && (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Resource title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
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

              <div className="space-y-2">
                <Label>Resource type</Label>
                <Select value={resourceType} onValueChange={(v) => setResourceType(v as ResourceType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {RESOURCE_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="What is this resource about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  placeholder="e.g. exam, revision, important"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleUpload} disabled={uploading || !file || !subjectId}>
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
