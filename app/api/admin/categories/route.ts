import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireRoleApi } from '@/lib/auth/api-guards';
import { can } from '@/lib/auth/roles';
import { categorySchema } from '@/lib/validation/menu';

export async function GET() {
  const guard = await requireRoleApi([], can.editMenu);
  if (!guard.ok) return guard.response;

  const supabase = createServiceClient();
  const restaurantId = guard.session.restaurantId;

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('sort_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ categories: data });
}

export async function POST(request: Request) {
  const guard = await requireRoleApi([], can.editMenu);
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('categories')
    .insert({
      ...parsed.data,
      restaurant_id: guard.session.restaurantId,
      image_url: parsed.data.image_url || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ category: data }, { status: 201 });
}