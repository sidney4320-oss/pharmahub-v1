'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/providers/protected-route';
import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/components/providers/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SUBJECT_COLORS } from '@/lib/constants';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { User, LogOut, Plus, Trash2, Sparkles, ShieldCheck } from 'lucide-react';

function SettingsContent() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState(SUBJECT_COLORS[0].value);
  const [newIcon, setNewIcon] = useState('BookOpen');
  const [adding, setAdding] = useState(false);
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string; code: string | null }>>([]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    supabase.from('subjects').select('id, name, code').eq('user_id', user.id).order('name')
      .then(({ data, error }) => {
        if (!active) return;
        if (error) toast.error('Could not load subjects');
        setSubjects(data ?? []);
      })
      .catch(() => { if (active) toast.error('Could not load subjects'); });
    return () => { active = false; };
  }, [user]);

  const handleAddSubject = async () => {
    if (!newName.trim() || !user) return;
    setAdding(true);
    try {
      const { error } = await supabase.from('subjects').insert({
        user_id: user.id,
        name: newName.trim(),
        code: newCode.trim() || null,
        description: newDesc.trim() || null,
        color: newColor,
        icon: newIcon,
        semester: 1,
      });
      if (error) {
        toast.error('Could not add subject');
        return;
      }
      toast.success('Subject added');
      setNewName('');
      setNewCode('');
      setNewDesc('');
      const { data, error: loadError } = await supabase.from('subjects').select('id, name, code').eq('user_id', user.id).order('name');
      if (loadError) toast.error('Subject added, but the list could not be refreshed');
      setSubjects(data ?? []);
    } catch {
      toast.error('Could not add subject');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    try {
      const { error } = await supabase.from('subjects').delete().eq('id', id);
      if (error) {
        toast.error('Could not delete subject');
      } else {
        setSubjects((previous) => previous.filter((subject) => subject.id !== id));
        toast.success('Subject deleted');
      }
    } catch {
      toast.error('Could not delete subject');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const iconOptions = ['BookOpen', 'Pill', 'Dna', 'HeartPulse', 'Bone', 'Brain', 'Calculator', 'Atom', 'FlaskConical', 'Computer', 'MessageSquare', 'Stethoscope'];
  const aiProvider = process.env.NEXT_PUBLIC_AI_PROVIDER?.trim().toLowerCase();
  const aiProviderSelected = Boolean(aiProvider && aiProvider !== 'none');

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4 text-primary" />Account</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label className="text-xs text-muted-foreground">Email</Label><p className="mt-0.5 text-sm font-medium">{user?.email}</p></div>
          <div><Label className="text-xs text-muted-foreground">Role</Label><p className="mt-0.5 text-sm font-medium">Pharmacy Student</p></div>
          <Button variant="destructive" size="sm" onClick={handleSignOut}><LogOut className="mr-2 h-4 w-4" />Sign Out</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Plus className="h-4 w-4 text-primary" />Add Subject</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">Your 9 Semester 1 pharmacy subjects were added automatically. Add more subjects here.</p>
          <div className="space-y-2"><Label htmlFor="subjName">Subject name</Label><Input id="subjName" placeholder="e.g. Organic Chemistry" value={newName} onChange={(event) => setNewName(event.target.value)} /></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="subjCode">Code</Label><Input id="subjCode" placeholder="e.g. OCHM 201" value={newCode} onChange={(event) => setNewCode(event.target.value)} /></div>
            <div className="space-y-2"><Label>Icon</Label><Select value={newIcon} onValueChange={setNewIcon}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{iconOptions.map((icon) => <SelectItem key={icon} value={icon}>{icon}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="space-y-2"><Label>Color</Label><div className="flex flex-wrap gap-2">{SUBJECT_COLORS.map((color) => <button key={color.value} type="button" aria-label={`Select color ${color.value}`} aria-pressed={newColor === color.value} onClick={() => setNewColor(color.value)} className={`h-8 w-8 rounded-lg transition-all ${newColor === color.value ? 'ring-2 ring-offset-2 ring-foreground' : ''}`} style={{ backgroundColor: color.value }} />)}</div></div>
          <div className="space-y-2"><Label htmlFor="subjDesc">Description (optional)</Label><Input id="subjDesc" placeholder="Brief description..." value={newDesc} onChange={(event) => setNewDesc(event.target.value)} /></div>
          <Button onClick={handleAddSubject} disabled={adding || !newName.trim()}>{adding ? 'Adding...' : 'Add Subject'}</Button>
        </CardContent>
      </Card>

      {subjects.length > 0 && <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Your Subjects</CardTitle></CardHeader>
        <CardContent className="space-y-2">{subjects.map((subject) => <div key={subject.id} className="flex items-center justify-between gap-3 rounded-lg bg-secondary/50 p-2.5"><div className="min-w-0"><p className="truncate text-sm font-medium">{subject.name}</p>{subject.code && <p className="text-xs text-muted-foreground">{subject.code}</p>}</div><button type="button" aria-label={`Delete ${subject.name}`} onClick={() => handleDeleteSubject(subject.id)} className="p-1 text-muted-foreground transition-colors hover:text-destructive"><Trash2 className="h-4 w-4" /></button></div>)}</CardContent>
      </Card>}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" />AI Features</CardTitle></CardHeader>
        <CardContent>
          <Badge variant="secondary">{aiProviderSelected ? `Provider selected: ${aiProvider}` : 'Not configured'}</Badge>
          <p className="mt-2 text-xs text-muted-foreground">Summaries, flashcards, quizzes, and concept explanations require a supported NEXT_PUBLIC_AI_PROVIDER and a server-side GOOGLE_AI_API_KEY. Keep provider API keys on the server; do not expose them as NEXT_PUBLIC variables. If configuration is missing, AI requests return a friendly error and other app features remain available.</p>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardContent className="flex items-start gap-3 p-5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div><Badge className="mb-2 bg-primary/10 text-primary hover:bg-primary/15">Proprietary Software of Sidney</Badge><p className="text-sm font-medium">PharmaHub</p><p className="mt-1 text-xs text-muted-foreground">© {new Date().getFullYear()} Sidney. All rights reserved.</p></div>
        </CardContent>
      </Card>
      <p className="py-2 text-center text-xs text-muted-foreground">PharmaHub — Everything you need to learn pharmacy, in one place.</p>
    </div>
  );
}

export default function SettingsPage() {
  return <ProtectedRoute><AppShell title="Settings" subtitle="Manage your account and subjects"><SettingsContent /></AppShell></ProtectedRoute>;
}
