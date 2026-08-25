import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const { data: restaurant, error } = await supabase
    .from('restaurants')
    .select('id, name, slug, logo_url, phone, email, address')
    .limit(1)
    .maybeSingle();

  if (error || !restaurant) {
    return NextResponse.json({ error: 'No restaurant found' }, { status: 404 });
  }

  return NextResponse.json({ restaurant });
}
