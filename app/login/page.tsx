'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pill, BookOpen, Brain, CalendarClock, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const { signIn, signInWithGoogle, resetPassword } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error === 'Invalid login credentials'
        ? 'Wrong email or password. Please try again.'
        : error);
    } else {
      toast.success('Welcome back!');
      router.push('/dashboard');
    }
  };

  const handleReset = async () => {
    if (!email) {
      toast.error('Enter your email address first.');
      return;
    }
    setResetLoading(true);
    const { error } = await resetPassword(email);
    setResetLoading(false);
    if (error) toast.error(error);
    else {
      toast.success('Password reset instructions have been sent.');
      setResetOpen(false);
    }
  };

  const handleGoogle = async () => {
    setOauthLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setOauthLoading(false);
      toast.error(error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-primary p-12 text-primary-foreground">
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
            Your pharmacy learning workspace.
          </h2>
          <p className="text-primary-foreground/80 mb-8">
            Upload your lecture notes, PDFs, and images. Organize them by subject and topic.
            Search across all your materials. Study smarter.
          </p>

          <div className="space-y-4">
            {[
              { icon: BookOpen, text: 'Organize materials by subject & topic' },
              { icon: Brain, text: 'Study mode, quizzes, and flashcards' },
              { icon: CalendarClock, text: 'Track exams and never miss a deadline' },
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
          Turn scattered notes into a connected learning system.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
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

          <h2 className="text-2xl font-bold mb-1">Welcome back</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Sign in to continue your study journey.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" aria-busy={loading}>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={() => setResetOpen((open) => !open)}
                  aria-expanded={resetOpen}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-11"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {resetOpen && (
              <div className="rounded-lg border border-border bg-secondary/40 p-3 space-y-2" aria-busy={resetLoading}>
                <p className="text-xs text-muted-foreground">Send reset instructions to the email above.</p>
                <Button type="button" size="sm" variant="outline" onClick={handleReset} disabled={resetLoading}>
                  {resetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send reset email'}
                </Button>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or continue with</span></div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogle}
            disabled={oauthLoading}
            aria-busy={oauthLoading}
          >
            {oauthLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M21.35 12.2c0-.74-.07-1.45-.19-2.13H12v4.03h5.23a4.47 4.47 0 0 1-1.94 2.93v2.72h3.14c1.84-1.7 2.92-4.2 2.92-7.55Z"/>
                <path fill="#34A853" d="M12 21.7c2.62 0 4.82-.87 6.43-2.35l-3.14-2.72c-.87.58-1.98.93-3.29.93-2.53 0-4.68-1.71-5.45-4.01H3.32v2.81A9.65 9.65 0 0 0 12 21.7Z"/>
                <path fill="#FBBC05" d="M6.55 13.55A5.8 5.8 0 0 1 6.25 12c0-.54.1-1.07.3-1.55V7.64H3.32A9.66 9.66 0 0 0 2.35 12c0 1.58.38 3.08 1.06 4.36l3.14-2.81Z"/>
                <path fill="#EA4335" d="M12 6.44c1.43 0 2.71.49 3.72 1.45l2.79-2.79A9.29 9.29 0 0 0 12 2.3a9.65 9.65 0 0 0-8.68 5.34l3.23 2.81C7.32 8.15 9.47 6.44 12 6.44Z"/>
              </svg>
            )}
            Continue with Google
          </Button>

          <p className="text-sm text-center text-muted-foreground mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-primary font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
