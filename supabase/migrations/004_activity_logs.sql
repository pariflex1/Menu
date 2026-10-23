-- Migration: 004_activity_logs.sql
-- Activity & Audit Logs for Admin Panel

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  level VARCHAR(20) NOT NULL DEFAULT 'info',
  actor_name VARCHAR(100) NOT NULL DEFAULT 'System',
  actor_role VARCHAR(50),
  details TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_restaurant_created 
  ON public.activity_logs(restaurant_id, created_at DESC);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view logs of their restaurant"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to activity_logs"
  ON public.activity_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
