import { createServiceClient } from '@/lib/supabase/service';

export interface LogEntryOptions {
  restaurantId?: string;
  action: string;
  level?: 'info' | 'warning' | 'error' | 'success';
  actorName?: string;
  actorRole?: string;
  details: string;
  metadata?: Record<string, any>;
}

export async function logActivity(options: LogEntryOptions) {
  try {
    const supabase = createServiceClient();
    let restaurantId = options.restaurantId;
    if (!restaurantId) {
      const { data: rest } = await supabase.from('restaurants').select('id').limit(1).maybeSingle();
      restaurantId = rest?.id;
    }

    if (!restaurantId) return;

    await supabase.from('activity_logs').insert({
      restaurant_id: restaurantId,
      action: options.action,
      level: options.level || 'info',
      actor_name: options.actorName || 'System',
      actor_role: options.actorRole || 'system',
      details: options.details,
      metadata: options.metadata || {},
    });
  } catch (err) {
    console.error('Failed to write activity log:', err);
  }
}
