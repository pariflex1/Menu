'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { loginSchema, type LoginInput } from '@/lib/validation/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');
  const [serverError, setServerError] = useState<string | null>(
    errorParam === 'forbidden' ? 'You do not have permission to access that page.' : null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
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
    <main className="min-h-dvh flex flex-col items-center justify-center bg-[#F4F9F4] px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl border border-emerald-100 bg-white p-7 shadow-xl space-y-6">
        {/* Logo */}
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-3">
            <Image
              src="https://krishnaanandam.in/wp-content/uploads/2026/08/logo-black.webp"
              alt="Krishna Anandam"
              width={220}
              height={60}
              className="h-12 w-auto object-contain"
              unoptimized
              priority
            />
          </div>
          <p className="text-sm text-gray-500 font-normal">Staff &amp; Management Dashboard</p>
        </div>

        {/* Error */}
        {serverError && (
          <div
            className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-600 font-normal animate-in fade-in"
            role="alert"
          >
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Identifier: Email or Mobile */}
          <div className="space-y-1.5">
            <label htmlFor="identifier" className="text-sm font-semibold text-slate-700">
              Email or Mobile Number
            </label>
            <input
              {...register('identifier')}
              id="identifier"
              type="text"
              inputMode="email"
              autoComplete="username"
              className={cn(
                'flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm',
                'placeholder:text-slate-400',
                'focus:outline-none focus:ring-2 focus:ring-[#05C12F] focus:bg-white transition-all',
                'disabled:cursor-not-allowed disabled:opacity-50',
                errors.identifier && 'border-red-400 focus:ring-red-400',
              )}
              disabled={isLoading}
              placeholder="your@email.com or 9876543210"
            />
            {errors.identifier && (
              <p className="text-xs text-red-500" role="alert">
                {errors.identifier.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-semibold text-slate-700">
              Password
            </label>
            <div className="relative">
              <input
                {...register('password')}
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className={cn(
                  'flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 pr-11 text-sm',
                  'placeholder:text-slate-400',
                  'focus:outline-none focus:ring-2 focus:ring-[#05C12F] focus:bg-white transition-all',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  errors.password && 'border-red-400 focus:ring-red-400',
                )}
                disabled={isLoading}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-medium select-none cursor-pointer"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-11 rounded-xl bg-[#05C12F] hover:bg-[#04A328] font-bold text-white shadow-md text-sm cursor-pointer"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in…' : 'Sign in to Dashboard'}
          </Button>
        </form>

        <p className="text-center text-xs text-gray-400 font-normal">
          Krishna Anandam &bull; Staff Access Only
        </p>
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