-- ============================================================================
-- PRD Phase 6 CRM Funnels Migration
-- NexDrive Automotive ERP
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.crm_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_funnel_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES public.crm_funnels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color_theme TEXT DEFAULT 'bg-slate-100 text-slate-800',
  stage_order INTEGER NOT NULL DEFAULT 0,
  is_system_won BOOLEAN DEFAULT false,
  is_system_lost BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Drop old check constraint on status_step so we can transition gracefully
ALTER TABLE public.crm_leads DROP CONSTRAINT IF EXISTS crm_leads_status_step_check;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS funnel_id UUID REFERENCES public.crm_funnels(id);
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES public.crm_funnel_stages(id);

-- Updated_at triggers
DROP TRIGGER IF EXISTS trg_crm_funnels_updated_at ON public.crm_funnels;
CREATE TRIGGER trg_crm_funnels_updated_at
  BEFORE UPDATE ON public.crm_funnels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_crm_funnel_stages_updated_at ON public.crm_funnel_stages;
CREATE TRIGGER trg_crm_funnel_stages_updated_at
  BEFORE UPDATE ON public.crm_funnel_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.crm_funnels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own funnels" ON public.crm_funnels;
CREATE POLICY "Users manage own funnels" ON public.crm_funnels FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.crm_funnel_stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own funnel stages" ON public.crm_funnel_stages;
CREATE POLICY "Users manage own funnel stages" ON public.crm_funnel_stages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.crm_funnels WHERE id = funnel_id AND user_id = auth.uid())
);

-- Seed Function
CREATE OR REPLACE FUNCTION public.seed_default_crm_funnel(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_funnel_id UUID;
  v_stage_new UUID;
  v_stage_cont UUID;
  v_stage_qual UUID;
  v_stage_nego UUID;
  v_stage_prop UUID;
  v_stage_conv UUID;
  v_stage_lost UUID;
BEGIN
  -- Check if user already has a funnel
  SELECT id INTO v_funnel_id FROM public.crm_funnels WHERE user_id = p_user_id LIMIT 1;
  IF v_funnel_id IS NOT NULL THEN
    RETURN v_funnel_id;
  END IF;

  INSERT INTO public.crm_funnels (user_id, name) VALUES (p_user_id, 'Venda de Veículos') RETURNING id INTO v_funnel_id;

  INSERT INTO public.crm_funnel_stages (funnel_id, name, color_theme, stage_order) VALUES (v_funnel_id, 'Novo', 'bg-blue-100 text-blue-800', 1) RETURNING id INTO v_stage_new;
  INSERT INTO public.crm_funnel_stages (funnel_id, name, color_theme, stage_order) VALUES (v_funnel_id, 'Contatado', 'bg-yellow-100 text-yellow-800', 2) RETURNING id INTO v_stage_cont;
  INSERT INTO public.crm_funnel_stages (funnel_id, name, color_theme, stage_order) VALUES (v_funnel_id, 'Qualificado', 'bg-cyan-100 text-cyan-800', 3) RETURNING id INTO v_stage_qual;
  INSERT INTO public.crm_funnel_stages (funnel_id, name, color_theme, stage_order) VALUES (v_funnel_id, 'Em Negociação', 'bg-orange-100 text-orange-800', 4) RETURNING id INTO v_stage_nego;
  INSERT INTO public.crm_funnel_stages (funnel_id, name, color_theme, stage_order) VALUES (v_funnel_id, 'Proposta', 'bg-violet-100 text-violet-800', 5) RETURNING id INTO v_stage_prop;
  INSERT INTO public.crm_funnel_stages (funnel_id, name, color_theme, stage_order, is_system_won) VALUES (v_funnel_id, 'Convertido', 'bg-green-100 text-green-800', 6, true) RETURNING id INTO v_stage_conv;
  INSERT INTO public.crm_funnel_stages (funnel_id, name, color_theme, stage_order, is_system_lost) VALUES (v_funnel_id, 'Perdido', 'bg-red-100 text-red-800', 7, true) RETURNING id INTO v_stage_lost;

  -- Migrate existing leads safely using old status_step
  UPDATE public.crm_leads SET funnel_id = v_funnel_id, stage_id = v_stage_new WHERE user_id = p_user_id AND status_step = 'new';
  UPDATE public.crm_leads SET funnel_id = v_funnel_id, stage_id = v_stage_cont WHERE user_id = p_user_id AND status_step = 'contacted';
  UPDATE public.crm_leads SET funnel_id = v_funnel_id, stage_id = v_stage_qual WHERE user_id = p_user_id AND status_step = 'qualified';
  UPDATE public.crm_leads SET funnel_id = v_funnel_id, stage_id = v_stage_nego WHERE user_id = p_user_id AND status_step = 'negotiation';
  UPDATE public.crm_leads SET funnel_id = v_funnel_id, stage_id = v_stage_prop WHERE user_id = p_user_id AND status_step = 'proposal';
  UPDATE public.crm_leads SET funnel_id = v_funnel_id, stage_id = v_stage_conv WHERE user_id = p_user_id AND status_step = 'converted';
  UPDATE public.crm_leads SET funnel_id = v_funnel_id, stage_id = v_stage_lost WHERE user_id = p_user_id AND status_step = 'lost';

  RETURN v_funnel_id;
END;
$$;

-- Seed script for existing users who already have leads
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT user_id FROM public.crm_leads LOOP
    PERFORM public.seed_default_crm_funnel(r.user_id);
  END LOOP;
END;
$$;

COMMIT;
