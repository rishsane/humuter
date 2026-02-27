'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Loader2, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectTo = searchParams.get('redirectTo');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const callbackUrl = redirectTo
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
      : `${window.location.origin}/auth/callback`;

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl,
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 6) {
      toast.error('Please enter the verification code');
      return;
    }

    setVerifying(true);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'email',
    });

    if (error) {
      toast.error('Invalid or expired code. Please try again.');
      setVerifying(false);
      return;
    }

    router.push(redirectTo || '/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <Card className="relative w-full max-w-md border border-neutral-200 bg-white shadow-none rounded-none">
        {/* Corner bracket decorations */}
        <div className="absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-orange-500" />
        <div className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-orange-500" />
        <div className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-orange-500" />
        <div className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-orange-500" />

        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-orange-500">
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none" className="text-white">
              <rect x="3" y="3" width="5" height="5" rx="1" fill="currentColor" />
              <rect x="12" y="3" width="5" height="5" rx="1" fill="currentColor" />
              <rect x="3" y="12" width="5" height="5" rx="1" fill="currentColor" />
              <rect x="12" y="12" width="5" height="5" rx="1" fill="currentColor" />
            </svg>
          </div>
          <CardTitle className="font-mono text-2xl font-bold tracking-tight text-neutral-900">
            {sent ? 'CHECK YOUR EMAIL' : 'WELCOME TO HUMUTER'}{!sent && <span className="ml-2 inline-block rounded-sm bg-orange-100 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-orange-600 align-middle">Beta</span>}
          </CardTitle>
          <CardDescription className="font-mono text-sm text-neutral-500">
            {sent
              ? `We sent a login email to ${email}`
              : 'Sign in with your email to continue'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              {showCodeInput ? (
                <form onSubmit={handleVerifyCode} className="space-y-4 text-left">
                  <div className="space-y-2">
                    <Label htmlFor="code" className="font-mono text-sm uppercase tracking-wider text-neutral-700">
                      Verification code
                    </Label>
                    <Input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={8}
                      placeholder="123456"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      required
                      autoFocus
                      className="border-neutral-200 bg-white text-neutral-900 font-mono rounded-none placeholder:text-neutral-400 text-center text-2xl tracking-[0.5em]"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={verifying}
                    className="w-full rounded-none bg-orange-500 text-white hover:bg-orange-600 font-mono uppercase tracking-wider"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify Code'
                    )}
                  </Button>
                </form>
              ) : (
                <>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center border border-neutral-200 rounded-none bg-orange-50">
                    <Mail className="h-8 w-8 text-orange-500" />
                  </div>
                  <p className="font-mono text-sm text-neutral-500">
                    Click the magic link in your email to sign in.
                  </p>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 font-mono text-sm text-neutral-400 hover:text-orange-500 transition-colors"
                    onClick={() => setShowCodeInput(true)}
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Sign in with verification code instead
                  </button>
                </>
              )}
              <Button
                variant="ghost"
                className="font-mono text-sm uppercase tracking-wider text-orange-500 hover:text-orange-600 hover:bg-orange-50 rounded-none"
                onClick={() => {
                  setSent(false);
                  setEmail('');
                  setShowCodeInput(false);
                  setCode('');
                }}
              >
                Use a different email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-mono text-sm uppercase tracking-wider text-neutral-700">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-neutral-200 bg-white text-neutral-900 font-mono rounded-none placeholder:text-neutral-400"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-none bg-orange-500 text-white hover:bg-orange-600 font-mono uppercase tracking-wider"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Magic Link'
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/" className="font-mono text-sm text-neutral-400 hover:text-neutral-900">
              Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
