import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function POST() {
  const cookieStore = cookies();
  cookieStore.set('ka_test_staff', 'owner', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return NextResponse.json({ ok: true, role: 'owner' });
}

export async function GET(request: Request) {
  const cookieStore = cookies();
  cookieStore.set('ka_test_staff', 'owner', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  });

  const url = new URL('/dashboard', request.url);
  return NextResponse.redirect(url);
}
