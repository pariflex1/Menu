import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const revalidate = 60; // Next.js ISR revalidation every 60 seconds

const DEFAULT_RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';

// Server-side in-memory cache for sub-millisecond response times
let cachedData: { [key: string]: { data: any; timestamp: number } } = {};
const CACHE_TTL_MS = 60 * 1000; // 60s memory cache

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bypassCache = searchParams.get('refresh') === 'true';
  const restaurantIdParam = searchParams.get('restaurant_id');
  const cacheKey = restaurantIdParam || 'default';

  // Check in-memory cache
  if (!bypassCache && cachedData[cacheKey] && Date.now() - cachedData[cacheKey].timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cachedData[cacheKey].data, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'HIT',
      },
    });
  }

  const supabase = await createClient();
  let restaurantId = restaurantIdParam;

  if (!restaurantId) {
    // Auto-resolve primary single restaurant
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .limit(1)
      .maybeSingle();

    restaurantId = restaurant?.id || DEFAULT_RESTAURANT_ID;
  }

  const [restaurantRes, settingsRes, categoriesRes] = await Promise.all([
    supabase
      .from('restaurants')
      .select('id, name, slug, phone, email, address, currency')
      .eq('id', restaurantId)
      .maybeSingle(),
    supabase
      .from('restaurant_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .maybeSingle(),
    supabase
      .from('categories')
      .select('id, name, description, image_url, sort_order, is_active')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ]);

  if (categoriesRes.error) {
    return NextResponse.json({ error: categoriesRes.error.message }, { status: 500 });
  }

  const categories = categoriesRes.data ?? [];
  const categoryIds = categories.map((c) => c.id);

  if (categoryIds.length === 0) {
    const emptyPayload = {
      restaurant: restaurantRes.data,
      settings: settingsRes.data,
      categories: [],
    };
    cachedData[cacheKey] = { data: emptyPayload, timestamp: Date.now() };
    return NextResponse.json(emptyPayload);
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

  // Pre-index items by category for O(N) grouping speed
  const itemsByCategory: Record<string, any[]> = {};
  for (const item of items ?? []) {
    if (!itemsByCategory[item.category_id]) {
      itemsByCategory[item.category_id] = [];
    }
    itemsByCategory[item.category_id].push({
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
    });
  }

  const categoriesWithItems = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    image_url: cat.image_url,
    sort_order: cat.sort_order,
    items: itemsByCategory[cat.id] || [],
  }));

  const payload = {
    restaurant: restaurantRes.data,
    settings: settingsRes.data,
    categories: categoriesWithItems,
  };

  // Cache in memory
  cachedData[cacheKey] = { data: payload, timestamp: Date.now() };

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
      'X-Cache': 'MISS',
    },
  });
}
