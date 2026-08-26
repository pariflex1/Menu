'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { loginSchema, type LoginInput } from '@/lib/validation/auth';
import PwaInstallBanner, { PwaInstallButton } from '@/components/pwa-install-banner';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');
  const [serverError, setServerError] = useState<string | null>(errorParam === 'forbidden' ? 'You do not have permission to access that page.' : null);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setServerError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error || 'Login failed. Check your credentials.');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setServerError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-dvh flex flex-col bg-[#F4F9F4]">
      <PwaInstallBanner />

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white p-6 shadow-xl relative">
          <div className="flex justify-end mb-2">
            <PwaInstallButton variant="pill" label="Install App" />
          </div>

          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 text-xl font-black mb-2 shadow-inner">
              KA
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">KRISHNA ANANDAM</h1>
            <p className="mt-1 text-sm text-slate-500">Staff & Management Dashboard Login</p>
          </div>

        {serverError && (
          <div
            className={cn(
              'mb-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive font-medium',
              serverError && 'animate-in fade-in'
            )}
            role="alert"
          >
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-semibold text-slate-700">
              Email
            </label>
            <input
              {...register('email')}
              id="email"
              type="email"
              autoComplete="email"
              className={cn(
                'flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm',
                'placeholder:text-slate-400',
                'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all',
                'disabled:cursor-not-allowed disabled:opacity-50',
                errors.email && 'border-destructive focus:ring-destructive'
              )}
              disabled={isLoading}
              placeholder="staff@krishnaanandam.com"
            />
            {errors.email && (
              <p className="text-xs text-destructive" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-semibold text-slate-700">
              Password
            </label>
            <input
              {...register('password')}
              id="password"
              type="password"
              autoComplete="current-password"
              className={cn(
                'flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm',
                'placeholder:text-slate-400',
                'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all',
                'disabled:cursor-not-allowed disabled:opacity-50',
                errors.password && 'border-destructive focus:ring-destructive'
              )}
              disabled={isLoading}
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-xs text-destructive" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-md text-sm" disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Sign in to Dashboard'}
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 bg-emerald-50/70 p-4 rounded-xl text-center space-y-1.5">
          <p className="text-xs font-bold text-emerald-800">🔑 Test Staff Credentials:</p>
          <p className="text-xs text-slate-600 font-mono">Email: <span className="font-bold text-slate-900">staff@krishnaanandam.com</span></p>
          <p className="text-xs text-slate-600 font-mono">Password: <span className="font-bold text-slate-900">Password123!</span></p>
        </div>
      </div>
    </div>
  </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}