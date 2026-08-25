import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/validation/auth';

export async function POST(request: Request) {
  const body = await request.json();

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Verify the user has a staff profile (i.e., is mapped to a restaurant)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, restaurant_id')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (!profile) {
    // Sign them out since they have no staff access
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: 'No staff access configured for this account' },
      { status: 403 },
    );
  }

  return NextResponse.json({ ok: true });
}