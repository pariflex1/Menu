import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireRoleApi } from '@/lib/auth/api-guards';
import { can } from '@/lib/auth/roles';
import { menuItemSchema } from '@/lib/validation/menu';

export async function GET(request: Request) {
  const guard = await requireRoleApi([], can.editMenu);
  if (!guard.ok) return guard.response;

  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get('category_id');

  let query = supabase
    .from('menu_items')
    .select('*, menu_item_addons(*)')
    .eq('restaurant_id', guard.session.restaurantId)
    .order('sort_order', { ascending: true });

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data });
}

export async function POST(request: Request) {
  const guard = await requireRoleApi([], can.editMenu);
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const parsed = menuItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // Verify category belongs to this restaurant
  const supabase = createServiceClient();
  const { data: cat } = await supabase
    .from('categories')
    .select('id')
    .eq('id', parsed.data.category_id)
    .eq('restaurant_id', guard.session.restaurantId)
    .maybeSingle();

  if (!cat) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('menu_items')
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

  return NextResponse.json({ item: data }, { status: 201 });
}