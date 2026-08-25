'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function checkSetup() {
      try {
        const res = await fetch('/api/menu');
        const data = await res.json();
        if (res.ok && data.categories) {
          router.replace('/menu');
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Failed to connect:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    checkSetup();
  }, [router]);

  if (loading) {
    return (
      <main className="container flex min-h-dvh flex-col items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="space-y-4 max-w-2xl">
          <h1 className="text-3xl font-semibold">Database Setup Required</h1>
          <div className="rounded-lg border bg-card p-6 text-left space-y-4">
            <p className="text-muted-foreground">
              The database has not been initialized yet. Please follow these steps:
            </p>
            
            <div className="space-y-3">
              <div className="rounded-md bg-primary/10 p-4">
                <h3 className="font-semibold mb-2">Step 1: Setup Database</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Open Supabase SQL Editor</li>
                  <li>Copy contents of <code className="bg-muted px-1 py-0.5 rounded">setup-database.sql</code></li>
                  <li>Paste and click RUN</li>
                </ol>
                <a 
                  href="https://supabase.com/dashboard/project/mjgneisuyrlvvcjtdaaz/sql/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3 text-sm text-primary hover:underline"
                >
                  Open Supabase SQL Editor →
                </a>
              </div>

              <div className="rounded-md bg-primary/10 p-4">
                <h3 className="font-semibold mb-2">Step 2: Create Staff User</h3>
                <p className="text-sm text-muted-foreground">
                  See detailed instructions in <code className="bg-muted px-1 py-0.5 rounded">QUICK_START.md</code>
                </p>
              </div>

              <div className="rounded-md bg-primary/10 p-4">
                <h3 className="font-semibold mb-2">Step 3: Refresh This Page</h3>
                <p className="text-sm text-muted-foreground">
                  After running the SQL, refresh this page to see the menu
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <Link
              href="/login"
              className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Staff Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return null;
}