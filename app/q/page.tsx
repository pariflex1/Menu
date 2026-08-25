'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function QRResolver() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qrToken = searchParams.get('t');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!qrToken) {
      setError('Invalid or missing QR code');
      setLoading(false);
      return;
    }

    async function resolveQR() {
      try {
        const res = await fetch('/api/qr/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qr_token: qrToken }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error === 'invalid_qr_token' ? 'Invalid QR code. Please ask staff.' : 'Failed to start session');
          setLoading(false);
          return;
        }

        localStorage.setItem('session_token', data.session_token);
        localStorage.setItem('session_expires_at', data.expires_at);
        localStorage.setItem('order_context', JSON.stringify({
          type: data.source_type,
          name: data.source_name,
        }));

        router.replace('/menu');
      } catch (err) {
        console.error('QR scan error:', err);
        setError('Network error. Please try scanning again.');
        setLoading(false);
      }
    }

    resolveQR();
  }, [qrToken, router]);

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">Connecting to your table...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 bg-background">
      <div className="text-center max-w-sm space-y-4">
        <div className="text-4xl mb-2">⚠️</div>
        <h1 className="text-lg font-bold text-destructive">QR Verification Failed</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          onClick={() => router.push('/menu')}
          className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold text-sm"
        >
          Open Menu Directly
        </button>
      </div>
    </div>
  );
}

export default function QRPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center">Loading...</div>}>
      <QRResolver />
    </Suspense>
  );
}
