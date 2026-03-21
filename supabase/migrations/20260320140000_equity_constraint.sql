-- Função que valida que a soma das cotas de um veículo = 100%
CREATE OR REPLACE FUNCTION public.validate_vehicle_equity()
RETURNS TRIGGER AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(equity_percentage), 0)
  INTO v_total
  FROM public.vehicle_owners
  WHERE vehicle_id = COALESCE(NEW.vehicle_id, OLD.vehicle_id)
    AND deleted_at IS NULL;

  IF v_total > 100.00 THEN
    RAISE EXCEPTION 'A soma das cotas do veículo (%.2f%%) excede 100%%', v_total;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_equity ON public.vehicle_owners;
CREATE TRIGGER trg_validate_equity
  AFTER INSERT OR UPDATE ON public.vehicle_owners
  FOR EACH ROW EXECUTE FUNCTION public.validate_vehicle_equity();

-- Adicionar campo roi_type à tabela vehicle_owners para os 3 tipos de ROI (§3.1)
ALTER TABLE public.vehicle_owners
  ADD COLUMN IF NOT EXISTS roi_type TEXT DEFAULT 'SPREAD'
    CHECK (roi_type IN ('FIXED_MONTHLY', 'SPREAD', 'REVENUE_SHARE')),
  ADD COLUMN IF NOT EXISTS roi_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Adicionar campo fiscal_grace_until em products para Trava Fiscal 15 dias (§2.2)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS fiscal_grace_until DATE;
