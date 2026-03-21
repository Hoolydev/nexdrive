BEGIN;

-- ============================================================================
-- PRD Phase 2 – Template Engine, Pricing Intelligence, Contract Columns
-- NexDrive Automotive ERP
-- ============================================================================
-- NOTE: stock_entry_date and actual_sale_price already exist in products
-- from migration 20251003101544. We skip re-adding them safely via IF NOT EXISTS.
-- ============================================================================

-- ============================================================================
-- 1. CONTRACT TEMPLATES (Mustache/Handlebars template engine)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contract_templates (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id),
  name          TEXT        NOT NULL,
  contract_type TEXT        NOT NULL
    CHECK (contract_type IN ('CONSIGNMENT_IN', 'PURCHASE_IN', 'SALE_OUT', 'SERVICE_ORDER')),
  body          TEXT        NOT NULL,   -- Template with {{entity.name}}, {{vehicle.plate}}, etc.
  is_default    BOOLEAN     DEFAULT false,
  active        BOOLEAN     DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contract_templates'
      AND policyname = 'Users manage own contract_templates'
  ) THEN
    CREATE POLICY "Users manage own contract_templates"
      ON public.contract_templates
      FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END$$;

-- ============================================================================
-- 2. PRICING INTELLIGENCE CACHE (async scraping / FIPE results)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pricing_intelligence_cache (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand        TEXT        NOT NULL,
  model        TEXT        NOT NULL,
  year_model   INTEGER,
  fuel         TEXT,
  state        TEXT        DEFAULT 'SP',
  avg_price    NUMERIC(12,2),
  min_price    NUMERIC(12,2),
  max_price    NUMERIC(12,2),
  sample_count INTEGER,
  source       TEXT        DEFAULT 'webmotors',
  scraped_at   TIMESTAMPTZ DEFAULT now(),
  -- expires_at computed by application: scraped_at + 24h
  expires_at   TIMESTAMPTZ,
  UNIQUE (brand, model, year_model, fuel, state, source)
);

-- ============================================================================
-- 3. ADD COLUMNS TO contracts TABLE
-- ============================================================================

-- template_id: column exists in phase1 without FK — add FK constraint only
DO $$
BEGIN
  -- Add column if somehow missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'contracts'
      AND column_name  = 'template_id'
  ) THEN
    ALTER TABLE public.contracts
      ADD COLUMN template_id UUID;
  END IF;

  -- Add FK constraint if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contracts_template_id_fkey'
      AND conrelid = 'public.contracts'::regclass
  ) THEN
    ALTER TABLE public.contracts
      ADD CONSTRAINT contracts_template_id_fkey
      FOREIGN KEY (template_id) REFERENCES public.contract_templates(id);
  END IF;
END$$;

-- seller_entity_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'contracts'
      AND column_name  = 'seller_entity_id'
  ) THEN
    ALTER TABLE public.contracts
      ADD COLUMN seller_entity_id UUID REFERENCES public.entities(id);
  END IF;
END$$;

-- ============================================================================
-- 4. ADD COLUMNS TO products TABLE (safe — skip if already exists)
-- ============================================================================

DO $$
BEGIN
  -- actual_sale_price already exists from old migration as numeric — skip
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'products'
      AND column_name  = 'actual_sale_price'
  ) THEN
    ALTER TABLE public.products
      ADD COLUMN actual_sale_price NUMERIC(12,2);
  END IF;

  -- stock_entry_date already exists from old migration as timestamptz — skip
  -- We do NOT attempt to re-add it to avoid type-mismatch or 42P17 errors.
  -- The application uses the existing timestamptz column.

  -- days_in_stock: stored as plain integer, updated by application logic
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'products'
      AND column_name  = 'days_in_stock'
  ) THEN
    ALTER TABLE public.products
      ADD COLUMN days_in_stock INTEGER;
  END IF;
END$$;

-- ============================================================================
-- 5. ADD city COLUMN TO store_settings (used by Onboarding)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'store_settings'
      AND column_name  = 'city'
  ) THEN
    ALTER TABLE public.store_settings
      ADD COLUMN city TEXT;
  END IF;
END$$;

-- ============================================================================
-- 6. GRANTS — allow authenticated / anon roles to access tables
-- ============================================================================

-- store_settings: authenticated users full CRUD, anon can read active stores
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_settings TO authenticated;
GRANT SELECT ON public.store_settings TO anon;

-- contract_templates
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_templates TO authenticated;

-- pricing_intelligence_cache
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_intelligence_cache TO authenticated;
GRANT SELECT ON public.pricing_intelligence_cache TO anon;

-- ============================================================================
-- 7. TRIGGER: updated_at for contract_templates
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_contract_templates_updated_at'
  ) THEN
    CREATE TRIGGER trg_contract_templates_updated_at
      BEFORE UPDATE ON public.contract_templates
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

COMMIT;
