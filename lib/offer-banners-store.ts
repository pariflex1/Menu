import { createServiceClient } from '@/lib/supabase/service';
import type { OfferBanner } from '@/lib/banners';

const BUCKET = 'banners';
const CONFIG_PATH = 'offer-banners.json';
const BUCKET_OPTIONS = {
  public: true,
  fileSizeLimit: 5 * 1024 * 1024,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/json'],
};

async function ensureBucket() {
  const supabase = createServiceClient();
  const { error } = await supabase.storage.createBucket(BUCKET, BUCKET_OPTIONS);

  if (error && /already exists/i.test(error.message)) {
    const { error: updateError } = await supabase.storage.updateBucket(BUCKET, BUCKET_OPTIONS);
    if (updateError) {
      throw new Error(`Could not prepare banner storage: ${updateError.message}`);
    }
  } else if (error) {
    throw new Error(`Could not prepare banner storage: ${error.message}`);
  }

  return supabase;
}

export async function readOfferBanners(): Promise<OfferBanner[] | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(CONFIG_PATH);

  if (error || !data) return null;

  try {
    const parsed = JSON.parse(await data.text());
    return Array.isArray(parsed) ? (parsed as OfferBanner[]) : null;
  } catch {
    return null;
  }
}

export async function writeOfferBanners(banners: OfferBanner[]): Promise<void> {
  const supabase = await ensureBucket();
  const payload = new Blob([JSON.stringify(banners)], { type: 'application/json' });

  const { error } = await supabase.storage.from(BUCKET).upload(CONFIG_PATH, payload, {
    contentType: 'application/json',
    cacheControl: '15',
    upsert: true,
  });

  if (error) {
    throw new Error(`Could not save offer banners: ${error.message}`);
  }
}

export async function uploadBannerImage(buffer: Buffer, filename: string): Promise<string> {
  const supabase = await ensureBucket();
  const { error } = await supabase.storage.from(BUCKET).upload(filename, buffer, {
    contentType: 'image/webp',
    cacheControl: '31536000',
    upsert: false,
  });

  if (error) {
    throw new Error(`Could not upload banner image: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}
