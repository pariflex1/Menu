import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireRoleApi } from '@/lib/auth/api-guards';
import { z } from 'zod';
import { logActivity } from '@/lib/logging';

const createLogSchema = z.object({
  action: z.string().min(1).max(100),
  level: z.enum(['info', 'warning', 'error', 'success']).default('info'),
  details: z.string().min(1).max(1000),
});

export async function GET(request: Request) {
  // Only accessible to owner or manager (SuperAdmin)
  const guard = await requireRoleApi(['owner', 'manager']);
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200);
  const level = searchParams.get('level');

  const supabase = createServiceClient();
  let query = supabase
    .from('activity_logs')
    .select('*')
    .eq('restaurant_id', guard.session.restaurantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (level && ['info', 'warning', 'error', 'success'].includes(level)) {
    query = query.eq('level', level);
  }

  const { data: logs, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ logs: logs || [] });
}

export async function POST(request: Request) {
  const guard = await requireRoleApi(['owner', 'manager']);
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const parsed = createLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  await logActivity({
    restaurantId: guard.session.restaurantId,
    action: parsed.data.action,
    level: parsed.data.level,
    actorName: guard.session.name || 'Admin',
    actorRole: guard.session.role,
    details: parsed.data.details,
    metadata: { manual_entry: true, ip: request.headers.get('x-forwarded-for') || 'local' },
  });

  return NextResponse.json({ ok: true });
}
