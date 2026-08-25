import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const DEFAULT_RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const supabase = await createClient();

  let restaurantId = searchParams.get('restaurant_id');

  if (!restaurantId) {
    // Auto-resolve primary single restaurant
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .limit(1)
      .maybeSingle();

    restaurantId = restaurant?.id || DEFAULT_RESTAURANT_ID;
  }

  const { data: restaurantInfo } = await supabase
    .from('restaurants')
    .select('id, name, slug, phone, email, address, currency')
    .eq('id', restaurantId)
    .maybeSingle();

  const { data: settings } = await supabase
    .from('restaurant_settings')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .maybeSingle();

  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select(`
      id,
      name,
      description,
      image_url,
      sort_order,
      is_active
    `)
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (catError) {
    return NextResponse.json({ error: catError.message }, { status: 500 });
  }

  const categoryIds = categories?.map((c) => c.id) ?? [];
  if (categoryIds.length === 0) {
    return NextResponse.json({
      restaurant: restaurantInfo,
      settings,
      categories: []
    });
  }

  const { data: items, error: itemError } = await supabase
    .from('menu_items')
    .select(`
      id,
      category_id,
      name,
      description,
      price,
      image_url,
      veg_type,
      is_available,
      is_featured,
      sort_order,
      menu_item_addons (
        id,
        name,
        price,
        is_available
      )
    `)
    .in('category_id', categoryIds)
    .order('sort_order', { ascending: true })
    .limit(5000);

  if (itemError) {
    return NextResponse.json({ error: itemError.message }, { status: 500 });
  }

  // Group items by category
  const categoriesWithItems = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    image_url: cat.image_url,
    sort_order: cat.sort_order,
    items: (items ?? [])
      .filter((item) => item.category_id === cat.id)
      .map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: Number(item.price),
        image_url: item.image_url,
        veg_type: item.veg_type,
        is_available: item.is_available,
        is_featured: item.is_featured,
        sort_order: item.sort_order,
        addons: (item.menu_item_addons ?? []).map((addon: any) => ({
          id: addon.id,
          name: addon.name,
          price: Number(addon.price),
          is_available: addon.is_available,
        })),
      })),
  }));

  return NextResponse.json({
    restaurant: restaurantInfo,
    settings,
    categories: categoriesWithItems
  });
}
