import { NextResponse } from 'next/server';
import { DEFAULT_OFFER_BANNERS, type OfferBanner } from '@/lib/banners';
import { readOfferBanners } from '@/lib/offer-banners-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 30 * 1000;
let cache: { banners: OfferBanner[]; timestamp: number } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(
      { banners: cache.banners },
      { headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' } },
    );
  }

  const stored = await readOfferBanners();
  const banners = (stored ?? DEFAULT_OFFER_BANNERS)
    .filter((b) => b.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  cache = { banners, timestamp: Date.now() };

  return NextResponse.json(
    { banners },
    {
      headers: {
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=120',
      },
    },
  );
}
