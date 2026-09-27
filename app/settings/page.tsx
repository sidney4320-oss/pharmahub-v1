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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SUBJECT_COLORS } from '@/lib/constants';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  User,
  LogOut,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';

function SettingsContent() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  // Add subject
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState(SUBJECT_COLORS[0].value);
  const [newIcon, setNewIcon] = useState('BookOpen');
  const [adding, setAdding] = useState(false);

  const [subjects, setSubjects] = useState<Array<{ id: string; name: string; code: string | null }>>([]);

  // Load subjects
  useEffect(() => {
    if (!user) return;
    supabase.from('subjects').select('id, name, code').eq('user_id', user.id).order('name')
      .then(({ data }) => setSubjects(data ?? []));
  }, [user]);

  const handleAddSubject = async () => {
    if (!newName.trim() || !user) return;
    setAdding(true);
    const { error } = await supabase.from('subjects').insert({
      user_id: user.id,
      name: newName.trim(),
      code: newCode.trim() || null,
      description: newDesc.trim() || null,
      color: newColor,
      icon: newIcon,
      semester: 1,
    });
    setAdding(false);
    if (error) {
      toast.error('Could not add subject');
    } else {
      toast.success('Subject added');
      setNewName('');
      setNewCode('');
      setNewDesc('');
      // Reload
      const { data } = await supabase.from('subjects').select('id, name, code').eq('user_id', user.id).order('name');
      setSubjects(data ?? []);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) {
      toast.error('Could not delete subject');
    } else {
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      toast.success('Subject deleted');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const iconOptions = ['BookOpen', 'Pill', 'Dna', 'HeartPulse', 'Bone', 'Brain', 'Calculator', 'Atom', 'FlaskConical', 'Computer', 'MessageSquare', 'Stethoscope'];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Account */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Email</Label>
            <p className="text-sm font-medium mt-0.5">{user?.email}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Role</Label>
            <p className="text-sm font-medium mt-0.5">Pharmacy Student</p>
          </div>
          <Button variant="destructive" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      {/* Add subject */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            Add Subject
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Your 9 Semester 1 pharmacy subjects were added automatically. Add more subjects here.
          </p>

          <div className="space-y-2">
            <Label htmlFor="subjName">Subject name</Label>
            <Input
              id="subjName"
              placeholder="e.g. Organic Chemistry"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="subjCode">Code</Label>
              <Input
                id="subjCode"
                placeholder="e.g. OCHM 201"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <Select value={newIcon} onValueChange={setNewIcon}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((ic) => (
                    <SelectItem key={ic} value={ic}>{ic}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {SUBJECT_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setNewColor(c.value)}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    newColor === c.value ? 'ring-2 ring-offset-2 ring-foreground' : ''
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subjDesc">Description (optional)</Label>
            <Input
              id="subjDesc"
              placeholder="Brief description..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
          </div>

          <Button onClick={handleAddSubject} disabled={adding || !newName.trim()}>
            {adding ? 'Adding...' : 'Add Subject'}
          </Button>
        </CardContent>
      </Card>

      {/* Manage subjects */}
      {subjects.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your Subjects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {subjects.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-secondary/50">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{s.name}</p>
                  {s.code && <p className="text-xs text-muted-foreground">{s.code}</p>}
                </div>
                <button
                  onClick={() => handleDeleteSubject(s.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* AI info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            AI Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary">Not configured</Badge>
          <p className="text-xs text-muted-foreground mt-2">
            AI features (summaries, flashcard generation, quiz generation, concept explanations) are built as clean service abstractions. Once an AI provider is connected, these features activate automatically throughout the app.
          </p>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground py-4">
        PharmaHub — Everything you need to learn pharmacy, in one place.
      </p>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <AppShell title="Settings" subtitle="Manage your account and subjects">
        <SettingsContent />
      </AppShell>
    </ProtectedRoute>
  );
}
