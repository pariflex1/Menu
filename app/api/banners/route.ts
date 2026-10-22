import { NextResponse } from 'next/server';
import { DEFAULT_OFFER_BANNERS, getGlobalBanners } from '@/lib/banners';

export const runtime = 'nodejs';

export async function GET() {
  const currentBanners = getGlobalBanners();
  const activeBanners = currentBanners
    .filter((b) => b.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  return NextResponse.json({
    banners: activeBanners.length > 0 ? activeBanners : DEFAULT_OFFER_BANNERS,
  }, {
    headers: {
      'Cache-Control': 'public, max-age=15, stale-while-revalidate=60',
    },
  });
}
