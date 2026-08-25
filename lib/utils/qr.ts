/**
 * Generate a short opaque QR token (not the UUID).
 * Uses crypto.randomBytes for server-side generation.
 */
export function generateQrToken(prefix: 'T' | 'R'): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, (b) => b.toString(36)).join('').substring(0, 6).toUpperCase();
  return `${prefix}${suffix}`;
}

/**
 * Verify a QR token and return the source type and ID.
 * Called by POST /api/qr/session.
 */
export interface QrResolution {
  sourceType: 'table' | 'room';
  sourceId: string;
  restaurantId: string;
  sourceName: string;
}