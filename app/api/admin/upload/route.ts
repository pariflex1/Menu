import { NextRequest, NextResponse } from 'next/server';
import { requireStaffApi } from '@/lib/auth/api-guards';
import { uploadBannerImage } from '@/lib/offer-banners-store';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_SIZE_BYTES = 200 * 1024; // 200 KB
const MAX_INPUT_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  const guard = await requireStaffApi();
  if (!guard.ok) return guard.response;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    if (file.size > MAX_INPUT_BYTES) {
      return NextResponse.json({ error: 'Image must be smaller than 10 MB' }, { status: 400 });
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());

    let quality = 85;
    let outputBuffer: Buffer;

    do {
      outputBuffer = await sharp(inputBuffer)
        .resize(1200, 1600, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality, effort: 4 })
        .toBuffer();

      quality -= 5;
    } while (outputBuffer.length > MAX_SIZE_BYTES && quality >= 20);

    const filename = `banner-${uuidv4()}.webp`;
    const publicUrl = await uploadBannerImage(outputBuffer, filename);

    return NextResponse.json({
      url: publicUrl,
      size_kb: Math.round(outputBuffer.length / 1024),
      format: 'webp',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process image' },
      { status: 500 },
    );
  }
}
