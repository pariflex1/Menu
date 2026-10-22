import { NextResponse } from 'next/server';
import { DEFAULT_OFFER_BANNERS, OfferBanner, getGlobalBanners, setGlobalBanners } from '@/lib/banners';

export const runtime = 'nodejs';

export async function GET() {
  const banners = getGlobalBanners();
  return NextResponse.json({ banners: banners || DEFAULT_OFFER_BANNERS });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!Array.isArray(body.banners)) {
      return NextResponse.json({ error: 'Expected banners array' }, { status: 400 });
    }

    const updated: OfferBanner[] = body.banners.map((b: any, index: number) => ({
      id: b.id || `banner-${index + 1}`,
      title: String(b.title || ''),
      subtitle: String(b.subtitle || ''),
      badge: String(b.badge || ''),
      image_url: String(b.image_url || ''),
      link_url: b.link_url || '/menu',
      is_active: b.is_active ?? true,
      sort_order: typeof b.sort_order === 'number' ? b.sort_order : index + 1,
    }));

    setGlobalBanners(updated);

    return NextResponse.json({ success: true, banners: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save banners' }, { status: 500 });
  }
}
