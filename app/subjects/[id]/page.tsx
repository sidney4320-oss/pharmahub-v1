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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SubjectIcon } from '@/components/shared/subject-icon';
import { ProgressBadge } from '@/components/shared/progress-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { ResourceIcon } from '@/components/shared/resource-icon';
import { RESOURCE_TYPE_LABELS, TOPIC_STATUS_LABELS, TOPIC_STATUS_COLORS } from '@/lib/constants';
import { formatFileSize } from '@/lib/text-extract';
import type { Subject, Topic, Resource, Exam } from '@/types/database';
import { toast } from 'sonner';
import {
  Plus,
  ArrowLeft,
  FileText,
  Library,
  CalendarClock,
  Upload,
  ChevronRight,
} from 'lucide-react';
import { differenceInCalendarDays } from 'date-fns';

type TopicStatus = Topic['status'];

function SubjectDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const subjectId = params.id as string;

  const [subject, setSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  // Add topic dialog
  const [addTopicOpen, setAddTopicOpen] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const [savingTopic, setSavingTopic] = useState(false);

  // Edit subject dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editLecturer, setEditLecturer] = useState('');
  const [editExamDate, setEditExamDate] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [savingSubject, setSavingSubject] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    const { data: sub } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', subjectId)
      .maybeSingle();
    setSubject(sub as Subject | null);

    const [tops, ress, exs] = await Promise.all([
      supabase.from('topics').select('*').eq('subject_id', subjectId).order('sort_order'),
      supabase
        .from('resources')
        .select('*')
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: false }),
      supabase
        .from('exams')
        .select('*')
        .eq('subject_id', subjectId)
        .order('exam_date'),
    ]);

    setTopics((tops.data as Topic[]) ?? []);
    setResources((ress.data as Resource[]) ?? []);
    setExams((exs.data as Exam[]) ?? []);
    setLoading(false);
  }, [user, subjectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddTopic = async () => {
    if (!newTopicName.trim() || !user) return;
    setSavingTopic(true);
    const { error } = await supabase.from('topics').insert({
      user_id: user.id,
      subject_id: subjectId,
      name: newTopicName.trim(),
      description: newTopicDesc.trim() || null,
      sort_order: topics.length,
    });
    setSavingTopic(false);
    if (error) {
      toast.error('Could not create topic. Please try again.');
    } else {
      toast.success('Topic created');
      setNewTopicName('');
      setNewTopicDesc('');
      setAddTopicOpen(false);
      loadData();
    }
  };

  const handleUpdateTopicStatus = async (topicId: string, status: TopicStatus) => {
    const { error } = await supabase.from('topics').update({ status }).eq('id', topicId);
    if (error) {
      toast.error('Could not update status');
    } else {
      setTopics((prev) => prev.map((t) => (t.id === topicId ? { ...t, status } : t)));
    }
  };

  const handleSaveSubject = async () => {
    if (!subject) return;
    setSavingSubject(true);
    const { error } = await supabase
      .from('subjects')
      .update({
        name: editName.trim(),
        code: editCode.trim() || null,
        lecturer: editLecturer.trim() || null,
        exam_date: editExamDate || null,
        description: editDesc.trim() || null,
      })
      .eq('id', subject.id);
    setSavingSubject(false);
    if (error) {
      toast.error('Could not save changes');
    } else {
      toast.success('Subject updated');
      setEditOpen(false);
      loadData();
    }
  };

  const openEdit = () => {
    if (subject) {
      setEditName(subject.name);
      setEditCode(subject.code || '');
      setEditLecturer(subject.lecturer || '');
      setEditExamDate(subject.exam_date || '');
      setEditDesc(subject.description || '');
      setEditOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!subject) {
    return (
      <EmptyState
        title="Subject not found"
        description="This subject may have been deleted."
        action={
          <Link href="/subjects">
            <Button variant="outline">Back to Subjects</Button>
          </Link>
        }
      />
    );
  }

  const doneCount = topics.filter(
    (t) => t.status === 'understood' || t.status === 'mastered',
  ).length;
  const progress = topics.length > 0 ? Math.round((doneCount / topics.length) * 100) : 0;

  const upcomingExam = exams.find((e) => new Date(e.exam_date) >= new Date());
  const examDays = upcomingExam
    ? differenceInCalendarDays(new Date(upcomingExam.exam_date), new Date())
    : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link
        href="/subjects"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        All subjects
      </Link>

      {/* Subject header */}
      <Card>
        <CardContent className="p-5 lg:p-6">
          <div className="flex items-start gap-4">
            <SubjectIcon icon={subject.icon} color={subject.color} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h1 className="text-lg lg:text-xl font-bold leading-tight">{subject.name}</h1>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    {subject.code && <span className="font-medium">{subject.code}</span>}
                    {subject.lecturer && <span>· {subject.lecturer}</span>}
                    <span>· Semester {subject.semester}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={openEdit}>
                  Edit
                </Button>
              </div>

              {subject.description && (
                <p className="text-sm text-muted-foreground mt-3">{subject.description}</p>
              )}

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{progress}% · {doneCount}/{topics.length} topics</span>
                </div>
                <ProgressBadge value={progress} showLabel={false} />
              </div>

              {examDays !== null && (
                <div className="mt-4 flex items-center gap-2 text-sm">
                  <CalendarClock className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">Next exam:</span>
                  <span className="font-medium">{upcomingExam?.exam_name}</span>
                  <Badge variant={examDays <= 7 ? 'destructive' : 'secondary'}>
                    {examDays} days
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="topics">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="topics" className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            Topics
            <Badge variant="secondary" className="ml-1">{topics.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-1.5">
            <Library className="w-4 h-4" />
            Resources
            <Badge variant="secondary" className="ml-1">{resources.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="exams" className="flex items-center gap-1.5">
            <CalendarClock className="w-4 h-4" />
            Exams
            <Badge variant="secondary" className="ml-1">{exams.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Topics tab */}
        <TabsContent value="topics" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Topics</h3>
            <Dialog open={addTopicOpen} onOpenChange={setAddTopicOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Topic
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Topic to {subject.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="topicName">Topic name</Label>
                    <Input
                      id="topicName"
                      placeholder="e.g. Upper Limb, Cell Membrane..."
                      value={newTopicName}
                      onChange={(e) => setNewTopicName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="topicDesc">Description (optional)</Label>
                    <Textarea
                      id="topicDesc"
                      placeholder="Brief description of what this topic covers..."
                      value={newTopicDesc}
                      onChange={(e) => setNewTopicDesc(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddTopicOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddTopic} disabled={savingTopic || !newTopicName.trim()}>
                    {savingTopic ? 'Creating...' : 'Create Topic'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {topics.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-7 h-7" />}
              title="No topics yet"
              description="Add your first topic to start organizing resources and tracking progress."
              action={
                <Button size="sm" onClick={() => setAddTopicOpen(true)}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Topic
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {topics.map((topic) => (
                <Card key={topic.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <Link
                        href={`/topics/${topic.id}`}
                        className="flex-1 min-w-0 group"
                      >
                        <p className="font-medium text-sm group-hover:text-primary transition-colors">
                          {topic.name}
                        </p>
                        {topic.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {topic.description}
                          </p>
                        )}
                      </Link>
                      <div className="flex items-center gap-2 shrink-0">
                        <Select
                          value={topic.status}
                          onValueChange={(v) => handleUpdateTopicStatus(topic.id, v as TopicStatus)}
                        >
                          <SelectTrigger className="w-[130px] h-8 text-xs">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${TOPIC_STATUS_COLORS[topic.status]}`} />
                              <SelectValue />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(TOPIC_STATUS_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value} className="text-xs">
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Link href={`/topics/${topic.id}`}>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Resources tab */}
        <TabsContent value="resources" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Resources</h3>
            <Link href={`/library?subject=${subject.id}`}>
              <Button size="sm">
                <Upload className="w-4 h-4 mr-1.5" />
                Upload
              </Button>
            </Link>
          </div>
          {resources.length === 0 ? (
            <EmptyState
              icon={<Library className="w-7 h-7" />}
              title="No resources for this subject"
              description="Upload lecture notes, PDFs, or images for this subject."
              action={
                <Link href={`/library?subject=${subject.id}`}>
                  <Button size="sm">
                    <Upload className="w-4 h-4 mr-1.5" />
                    Upload Resource
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
                            {RESOURCE_TYPE_LABELS[r.resource_type]} · {formatFileSize(r.file_size)}
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

        {/* Exams tab */}
        <TabsContent value="exams" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Exams</h3>
            <Link href="/exams">
              <Button size="sm" variant="outline">
                <CalendarClock className="w-4 h-4 mr-1.5" />
                Manage Exams
              </Button>
            </Link>
          </div>
          {exams.length === 0 ? (
            <EmptyState
              icon={<CalendarClock className="w-7 h-7" />}
              title="No exams for this subject"
              description="Add an exam date to start planning your study schedule."
              action={
                <Link href="/exams">
                  <Button size="sm" variant="outline">
                    Add Exam
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-2">
              {exams.map((exam) => {
                const days = differenceInCalendarDays(new Date(exam.exam_date), new Date());
                return (
                  <Card key={exam.id}>
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{exam.exam_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(exam.exam_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'long',
                            day: 'numeric',
                          })}
                          {exam.exam_time && ` · ${exam.exam_time}`}
                          {exam.location && ` · ${exam.location}`}
                        </p>
                      </div>
                      <Badge variant={days <= 7 && days >= 0 ? 'destructive' : 'secondary'}>
                        {days >= 0 ? `${days} days` : 'Past'}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit subject dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="editName">Name</Label>
              <Input id="editName" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editCode">Code</Label>
                <Input id="editCode" value={editCode} onChange={(e) => setEditCode(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editExamDate">Exam Date</Label>
                <Input
                  id="editExamDate"
                  type="date"
                  value={editExamDate}
                  onChange={(e) => setEditExamDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editLecturer">Lecturer</Label>
              <Input
                id="editLecturer"
                value={editLecturer}
                onChange={(e) => setEditLecturer(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDesc">Description</Label>
              <Textarea
                id="editDesc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSubject} disabled={savingSubject}>
              {savingSubject ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SubjectDetailPage() {
  return (
    <ProtectedRoute>
      <AppShell title="Subject">
        <SubjectDetailContent />
      </AppShell>
    </ProtectedRoute>
  );
}
