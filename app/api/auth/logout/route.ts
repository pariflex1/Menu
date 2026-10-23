import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const cookieStore = cookies();
    cookieStore.delete('ka_test_staff');
  } catch {
    // Ignore
  }

  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Ignore
  }

  return NextResponse.json({ ok: true });
}