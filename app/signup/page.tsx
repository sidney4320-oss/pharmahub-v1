'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pill, ArrowRight, Loader2, BookOpen, Brain, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';

export default function SignupPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);
    if (error) {
      toast.error(
        error === 'User already registered'
          ? 'An account with this email already exists. Try signing in.'
          : error,
      );
    } else {
      toast.success('Account created! Your pharmacy subjects are ready.');
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 order-2 lg:order-1">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary text-primary-foreground">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">PharmaHub</h1>
              <p className="text-xs text-muted-foreground">Pharmacy Learning Hub</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-1">Create your account</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Get started with your 9 pharmacy subjects pre-loaded.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@pharmacy.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-primary p-12 text-primary-foreground order-1 lg:order-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-foreground/15">
            <Pill className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">PharmaHub</h1>
            <p className="text-sm text-primary-foreground/70">Pharmacy Learning Hub</p>
          </div>
        </div>

        <div className="max-w-md">
          <h2 className="text-3xl font-bold leading-tight mb-4">
            Turn scattered notes into a connected learning system.
          </h2>
          <p className="text-primary-foreground/80 mb-8">
            Upload your PDFs, lecture slides, handwritten note photos, and past papers.
            PharmaHub organizes everything by subject and topic so you always know where
            your materials are.
          </p>

          <div className="space-y-4">
            {[
              { icon: BookOpen, text: '9 pharmacy subjects pre-loaded for Semester 1' },
              { icon: Brain, text: 'Search across all your notes and materials' },
              { icon: CalendarClock, text: 'Track exams, plan study sessions, monitor progress' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-foreground/15">
                  <f.icon className="w-5 h-5" />
                </div>
                <span className="text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-primary-foreground/60">
          Your personal pharmacy study companion.
        </p>
      </div>
    </div>
  );
}
