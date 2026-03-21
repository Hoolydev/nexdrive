-- ============================================================================
-- FIX: Grant permissions to authenticated/anon roles for ALL tables
-- ============================================================================
-- The original GRANT ALL ON ALL TABLES only covered tables that existed
-- at the time it ran. Tables created afterwards have no grants.
-- This migration is idempotent (safe to re-run).
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. SCHEMA-LEVEL ACCESS
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- ============================================================================
-- 2. BLANKET GRANT — covers ALL existing and future tables/sequences/routines
-- ============================================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;

-- For default permissions on future tables created by the same role
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON ROUTINES TO authenticated;

-- ============================================================================
-- 3. ANON role — read-only on public-facing tables
-- ============================================================================
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.store_settings TO anon;
GRANT SELECT ON public.pricing_intelligence_cache TO anon;

-- Default for future tables: anon gets SELECT
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;

COMMIT;
