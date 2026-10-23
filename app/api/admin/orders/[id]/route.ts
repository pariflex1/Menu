import { NextResponse } from 'next/server';
import { PATCH as statusPatch } from '@/app/api/orders/[id]/status/route';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, context: { params: { id: string } }) {
  return statusPatch(request, context);
}
