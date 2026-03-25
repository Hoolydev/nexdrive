-- ============================================================
-- Migration: Meta API, voice_always_on, follow-up tables, store banner
-- ============================================================

-- 1. Extend ai_settings with channel_type, Z-API, Meta API + voice_always_on
ALTER TABLE public.ai_settings
  ADD COLUMN IF NOT EXISTS channel_type         TEXT    NOT NULL DEFAULT 'uazapi',
  -- Z-API specific
  ADD COLUMN IF NOT EXISTS zapi_instance_id     TEXT,
  ADD COLUMN IF NOT EXISTS zapi_instance_token  TEXT,
  ADD COLUMN IF NOT EXISTS zapi_client_token    TEXT,
  -- Meta Cloud API
  ADD COLUMN IF NOT EXISTS meta_access_token    TEXT,
  ADD COLUMN IF NOT EXISTS meta_phone_number_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_waba_id         TEXT,
  ADD COLUMN IF NOT EXISTS meta_verify_token    TEXT,
  -- Voice
  ADD COLUMN IF NOT EXISTS voice_always_on      BOOLEAN NOT NULL DEFAULT false;

-- 2. (Audio is sent as base64 directly — no storage bucket needed)

-- 3. Follow-up configuration tables
CREATE TABLE IF NOT EXISTS public.crm_follow_up_configs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'Sequência padrão',
  funnel_id   UUID REFERENCES public.crm_funnels(id) ON DELETE SET NULL,
  trigger_stage TEXT,   -- stage key that triggers this sequence (e.g. 'contacted')
  enabled     BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crm_follow_up_steps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id     UUID NOT NULL REFERENCES public.crm_follow_up_configs(id) ON DELETE CASCADE,
  step_number   INT  NOT NULL,
  delay_hours   INT  NOT NULL DEFAULT 24,
  message_template TEXT NOT NULL DEFAULT '',
  channel       TEXT NOT NULL DEFAULT 'whatsapp', -- whatsapp | email | sms
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (config_id, step_number)
);

-- RLS for follow-up tables
ALTER TABLE public.crm_follow_up_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_follow_up_steps   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own follow-up configs"
  ON public.crm_follow_up_configs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own follow-up steps"
  ON public.crm_follow_up_steps FOR ALL
  USING (
    config_id IN (
      SELECT id FROM public.crm_follow_up_configs WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    config_id IN (
      SELECT id FROM public.crm_follow_up_configs WHERE user_id = auth.uid()
    )
  );

-- 4. Add banner_url to store_settings
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- 5. (No extra storage policies needed)
