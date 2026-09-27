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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import type { Exam, Subject } from '@/types/database';
import { toast } from 'sonner';
import {
  Plus,
  CalendarClock,
  Trash2,
  MapPin,
  Clock,
} from 'lucide-react';
import { differenceInCalendarDays, format } from 'date-fns';

function ExamsContent() {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog
  const [open, setOpen] = useState(false);
  const [examName, setExamName] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examTime, setExamTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [exs, subs] = await Promise.all([
      supabase
        .from('exams')
        .select('*, subject:subjects(*)')
        .order('exam_date'),
      supabase.from('subjects').select('*').eq('user_id', user.id).order('name'),
    ]);
    setExams((exs.data as Exam[]) ?? []);
    setSubjects(subs.data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async () => {
    if (!examName.trim() || !examDate || !user) return;
    setSaving(true);
    const { error } = await supabase.from('exams').insert({
      user_id: user.id,
      subject_id: subjectId || null,
      exam_name: examName.trim(),
      exam_date: examDate,
      exam_time: examTime || null,
      location: location.trim() || null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error('Could not add exam');
    } else {
      toast.success('Exam added');
      setExamName('');
      setSubjectId('');
      setExamDate('');
      setExamTime('');
      setLocation('');
      setNotes('');
      setOpen(false);
      loadData();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('exams').delete().eq('id', id);
    if (error) {
      toast.error('Could not delete exam');
    } else {
      setExams((prev) => prev.filter((e) => e.id !== id));
      toast.success('Exam deleted');
    }
  };

  const now = new Date();
  const upcoming = exams
    .filter((e) => new Date(e.exam_date) >= now)
    .sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());
  const past = exams
    .filter((e) => new Date(e.exam_date) < now)
    .sort((a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime());

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const renderExamCard = (exam: Exam) => {
    const subject = subjects.find((s) => s.id === exam.subject_id);
    const days = differenceInCalendarDays(new Date(exam.exam_date), now);
    const isPast = days < 0;

    return (
      <Card key={exam.id}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              {subject && (
                <SubjectIcon icon={subject.icon} color={subject.color} size="md" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium">{exam.exam_name}</p>
                {subject && (
                  <p className="text-xs text-muted-foreground mt-0.5">{subject.name}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarClock className="w-3.5 h-3.5" />
                    {format(new Date(exam.exam_date), 'EEE, MMM d, yyyy')}
                  </span>
                  {exam.exam_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {exam.exam_time}
                    </span>
                  )}
                  {exam.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {exam.location}
                    </span>
                  )}
                </div>
                {exam.notes && (
                  <p className="text-xs text-muted-foreground mt-2">{exam.notes}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Badge variant={isPast ? 'secondary' : days <= 7 ? 'destructive' : 'secondary'}>
                {isPast ? 'Past' : `${days} days left`}
              </Badge>
              <button
                onClick={() => handleDelete(exam.id)}
                className="text-muted-foreground hover:text-destructive transition-colors p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {upcoming.length} upcoming · {past.length} past
        </p>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Exam
        </Button>
      </div>

      {exams.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="w-7 h-7" />}
          title="No exams scheduled"
          description="Add your next exam to start planning your study schedule."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Exam
            </Button>
          }
        />
      ) : (
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No upcoming exams. You&apos;re all caught up!
              </p>
            ) : (
              upcoming.map(renderExamCard)
            )}
          </TabsContent>
          <TabsContent value="past" className="space-y-3">
            {past.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No past exams recorded.
              </p>
            ) : (
              past.map(renderExamCard)
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Add exam dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Exam</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="examName">Exam name</Label>
              <Input
                id="examName"
                placeholder="e.g. Midterm Exam, Final Exam..."
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Subject (optional)</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="examDate">Date</Label>
                <Input
                  id="examDate"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="examTime">Time</Label>
                <Input
                  id="examTime"
                  type="time"
                  value={examTime}
                  onChange={(e) => setExamTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location (optional)</Label>
              <Input
                id="location"
                placeholder="e.g. Main Hall, Room 201..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="examNotes">Notes (optional)</Label>
              <Textarea
                id="examNotes"
                placeholder="Topics to cover, format, what to bring..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !examName.trim() || !examDate}>
              {saving ? 'Adding...' : 'Add Exam'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ExamsPage() {
  return (
    <ProtectedRoute>
      <AppShell title="Exams" subtitle="Your exam schedule">
        <ExamsContent />
      </AppShell>
    </ProtectedRoute>
  );
}
