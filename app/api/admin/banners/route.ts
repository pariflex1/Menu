import { NextResponse } from 'next/server';
import { requireRoleApi } from '@/lib/auth/api-guards';
import { can } from '@/lib/auth/roles';
import { DEFAULT_OFFER_BANNERS, type OfferBanner } from '@/lib/banners';
import { readOfferBanners, writeOfferBanners } from '@/lib/offer-banners-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeBanners(input: unknown): OfferBanner[] {
  if (!Array.isArray(input)) throw new Error('Expected banners array');

  return input.slice(0, 20).map((b: Record<string, unknown>, index: number) => ({
    id: String(b.id || `banner-${index + 1}`),
    title: String(b.title || ''),
    subtitle: String(b.subtitle || ''),
    badge: String(b.badge || ''),
    image_url: String(b.image_url || ''),
    link_url: String(b.link_url || '/menu'),
    is_active: b.is_active !== false,
    sort_order: typeof b.sort_order === 'number' ? b.sort_order : index + 1,
  }));
}

export async function GET() {
  const guard = await requireRoleApi([], can.editMenu);
  if (!guard.ok) return guard.response;

  try {
    const banners = await readOfferBanners();
    return NextResponse.json({ banners: banners?.length ? banners : DEFAULT_OFFER_BANNERS });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load banners' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const guard = await requireRoleApi([], can.editMenu);
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const banners = normalizeBanners(body.banners);
    await writeOfferBanners(banners);
    return NextResponse.json({ success: true, banners });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save banners' },
      { status: 500 },
    );
  }
}
