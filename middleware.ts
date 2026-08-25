import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match ONLY admin routes that require auth session updates.
     * Public customer routes (/menu, /order, /checkout, /api/menu, /api/orders, /)
     * bypass middleware to load with maximum speed.
     */
    '/dashboard/:path*',
    '/api/admin/:path*',
  ],
};