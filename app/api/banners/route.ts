import { NextResponse } from 'next/server';
import { DEFAULT_OFFER_BANNERS } from '@/lib/banners';
import { readOfferBanners } from '@/lib/offer-banners-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const stored = await readOfferBanners();
  const banners = (stored ?? DEFAULT_OFFER_BANNERS)
    .filter((b) => b.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  return NextResponse.json(
    { banners },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
