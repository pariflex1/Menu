import { NextRequest, NextResponse } from 'next/server';
import { requireStaffApi } from '@/lib/auth/api-guards';
import { uploadBannerImage } from '@/lib/offer-banners-store';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_INPUT_BYTES = 4.5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function POST(req: NextRequest) {
  const guard = await requireStaffApi();
  if (!guard.ok) return guard.response;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES[file.type]) {
      return NextResponse.json({ error: 'Only JPG, PNG and WebP images are allowed' }, { status: 400 });
    }

    if (file.size > MAX_INPUT_BYTES) {
      return NextResponse.json({ error: 'Image must be smaller than 4.5 MB' }, { status: 400 });
    }

    const extension = ALLOWED_TYPES[file.type];
    const filename = `banner-${uuidv4()}.${extension}`;
    const data = await file.arrayBuffer();
    const publicUrl = await uploadBannerImage(data, filename, file.type);

    return NextResponse.json({
      url: publicUrl,
      size_kb: Math.round(file.size / 1024),
      format: extension,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload image' },
      { status: 500 },
    );
  }
}
