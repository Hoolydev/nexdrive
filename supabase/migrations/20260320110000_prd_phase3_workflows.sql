-- Phase 3: Workflows, Vehicle Status Machine, and Event-Driven Cascading Triggers
BEGIN;

-- ============================================================
-- A. Vehicle Status Transition Validation
-- ============================================================
CREATE OR REPLACE FUNCTION validate_vehicle_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Define valid transitions
  IF OLD.status = 'shadow_inventory' AND NEW.status NOT IN ('quarantine', 'active') THEN
    RAISE EXCEPTION 'Invalid status transition from shadow_inventory to %', NEW.status;
  END IF;
  IF OLD.status = 'quarantine' AND NEW.status NOT IN ('active', 'shadow_inventory') THEN
    RAISE EXCEPTION 'Invalid status transition from quarantine to %', NEW.status;
  END IF;
  IF OLD.status = 'active' AND NEW.status NOT IN ('sold', 'quarantine') THEN
    RAISE EXCEPTION 'Invalid status transition from active to %', NEW.status;
  END IF;
  IF OLD.status = 'sold' AND NEW.status NOT IN ('archived', 'active') THEN
    RAISE EXCEPTION 'Invalid status transition from sold to %', NEW.status;
  END IF;
  IF OLD.status = 'archived' THEN
    RAISE EXCEPTION 'Cannot transition from archived status';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_vehicle_status ON public.products;
CREATE TRIGGER trg_validate_vehicle_status
  BEFORE UPDATE OF status ON public.products
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION validate_vehicle_status_transition();


-- ============================================================
-- B. Auto-generate payable on consignment sale
-- ============================================================
CREATE OR REPLACE FUNCTION on_vehicle_sold_consignment()
RETURNS TRIGGER AS $$
DECLARE
  v_owner RECORD;
  v_refundable_total NUMERIC;
  v_sale_price NUMERIC;
  v_payout NUMERIC;
  v_expense_category_id UUID;
BEGIN
  IF NEW.status = 'sold' AND OLD.status = 'active' THEN
    -- Find consigned owners
    FOR v_owner IN
      SELECT vo.entity_id, vo.equity_percentage
      FROM public.vehicle_owners vo
      WHERE vo.vehicle_id = NEW.id AND vo.ownership_type = 'consigned' AND vo.exit_date IS NULL
    LOOP
      -- Get sale price
      v_sale_price := COALESCE(NEW.actual_sale_price, NEW.price, 0);

      -- Sum refundable costs for this vehicle
      SELECT COALESCE(SUM(ft.amount), 0) INTO v_refundable_total
      FROM public.financial_transactions ft
      WHERE ft.vehicle_id = NEW.id AND ft.is_refundable = true AND ft.deleted_at IS NULL;

      -- Calculate payout: (sale_price * equity%) - refundable_costs
      v_payout := (v_sale_price * v_owner.equity_percentage / 100) - v_refundable_total;

      -- Get the investor repasse category
      SELECT id INTO v_expense_category_id
      FROM public.chart_of_accounts
      WHERE dre_mapping_key = 'DESPESA_REPASSE_INVESTIDOR' AND user_id = NEW.user_id
      LIMIT 1;

      IF v_expense_category_id IS NOT NULL AND v_payout > 0 THEN
        INSERT INTO public.financial_transactions (
          user_id, account_category_id, entity_id, vehicle_id,
          type, amount, due_date, status, description
        ) VALUES (
          NEW.user_id, v_expense_category_id, v_owner.entity_id, NEW.id,
          'expense', v_payout, CURRENT_DATE + INTERVAL '5 days', 'open',
          'Repasse consignação - ' || COALESCE(NEW.title, NEW.plate, NEW.id::text)
        );
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vehicle_sold_consignment ON public.products;
CREATE TRIGGER trg_vehicle_sold_consignment
  AFTER UPDATE OF status ON public.products
  FOR EACH ROW
  WHEN (NEW.status = 'sold' AND OLD.status = 'active')
  EXECUTE FUNCTION on_vehicle_sold_consignment();


-- ============================================================
-- C. Auto-generate commission on payment received (liquidation)
-- ============================================================
CREATE OR REPLACE FUNCTION on_payment_liquidated_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_seller RECORD;
  v_commission_amount NUMERIC;
  v_commission_category_id UUID;
BEGIN
  IF NEW.status = 'paid' AND OLD.status IN ('open', 'partial', 'overdue') AND NEW.type = 'income' AND NEW.vehicle_id IS NOT NULL THEN
    -- Find the seller linked to this transaction
    IF NEW.seller_entity_id IS NOT NULL THEN
      SELECT e.id, e.commission_rate, e.commission_pay_rule
      INTO v_seller
      FROM public.entities e
      WHERE e.id = NEW.seller_entity_id AND e.is_seller = true AND e.deleted_at IS NULL;

      IF v_seller.id IS NOT NULL AND v_seller.commission_rate IS NOT NULL THEN
        v_commission_amount := NEW.amount * v_seller.commission_rate / 100;

        SELECT id INTO v_commission_category_id
        FROM public.chart_of_accounts
        WHERE dre_mapping_key = 'DESPESA_VAR_COMISSAO' AND user_id = NEW.user_id
        LIMIT 1;

        IF v_commission_category_id IS NOT NULL THEN
          INSERT INTO public.financial_transactions (
            user_id, account_category_id, entity_id, vehicle_id,
            type, amount, due_date, status, description,
            commission_source_transaction_id, seller_entity_id
          ) VALUES (
            NEW.user_id, v_commission_category_id, v_seller.id, NEW.vehicle_id,
            'expense', v_commission_amount,
            CASE
              WHEN v_seller.commission_pay_rule = 'D+5' THEN CURRENT_DATE + INTERVAL '5 days'
              ELSE CURRENT_DATE + INTERVAL '5 days'
            END,
            'open',
            'Comissão venda - ' || COALESCE((SELECT title FROM public.products WHERE id = NEW.vehicle_id), ''),
            NEW.id, v_seller.id
          );
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_liquidated_commission ON public.financial_transactions;
CREATE TRIGGER trg_payment_liquidated_commission
  AFTER UPDATE OF status ON public.financial_transactions
  FOR EACH ROW
  WHEN (NEW.status = 'paid' AND OLD.status IN ('open', 'partial', 'overdue'))
  EXECUTE FUNCTION on_payment_liquidated_commission();


-- ============================================================
-- D. Audit log trigger (generic for all important tables)
-- ============================================================
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.sys_audit_logs (user_id, action, table_name, record_id, payload_before, payload_after)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to critical tables (DROP IF EXISTS first)
DROP TRIGGER IF EXISTS audit_entities ON public.entities;
CREATE TRIGGER audit_entities AFTER INSERT OR UPDATE OR DELETE ON public.entities FOR EACH ROW EXECUTE FUNCTION log_audit();
DROP TRIGGER IF EXISTS audit_financial_transactions ON public.financial_transactions;
CREATE TRIGGER audit_financial_transactions AFTER INSERT OR UPDATE OR DELETE ON public.financial_transactions FOR EACH ROW EXECUTE FUNCTION log_audit();
DROP TRIGGER IF EXISTS audit_products ON public.products;
CREATE TRIGGER audit_products AFTER INSERT OR UPDATE OR DELETE ON public.products FOR EACH ROW EXECUTE FUNCTION log_audit();
DROP TRIGGER IF EXISTS audit_contracts ON public.contracts;
CREATE TRIGGER audit_contracts AFTER INSERT OR UPDATE OR DELETE ON public.contracts FOR EACH ROW EXECUTE FUNCTION log_audit();
DROP TRIGGER IF EXISTS audit_vehicle_owners ON public.vehicle_owners;
CREATE TRIGGER audit_vehicle_owners AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_owners FOR EACH ROW EXECUTE FUNCTION log_audit();


-- ============================================================
-- E. Auto-mark overdue transactions (can be called by cron)
-- ============================================================
CREATE OR REPLACE FUNCTION mark_overdue_transactions()
RETURNS void AS $$
BEGIN
  UPDATE public.financial_transactions
  SET status = 'overdue', updated_at = now()
  WHERE status = 'open' AND due_date < CURRENT_DATE AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
