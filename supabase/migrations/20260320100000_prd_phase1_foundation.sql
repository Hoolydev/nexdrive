-- ============================================================================
-- PRD Phase 1 Foundation Migration
-- NexDrive Automotive ERP
-- 2026-03-20
-- ============================================================================
-- This migration creates the unified entity model, chart of accounts,
-- financial transactions, CRM leads, contracts, attachments, audit logs,
-- and migrates existing customer/salespeople data.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ENTITIES TABLE (Single Source of Truth for all people/companies)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  -- Identity
  document_num TEXT UNIQUE,
  document_type TEXT CHECK (document_type IN ('CPF', 'CNPJ')) DEFAULT 'CPF',
  name TEXT NOT NULL,
  trade_name TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  -- Address
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  -- Personal docs (for contracts)
  rg TEXT,
  rg_issuer TEXT,
  cnh TEXT,
  cnh_expiry DATE,
  birth_date DATE,
  nationality TEXT DEFAULT 'Brasileiro(a)',
  marital_status TEXT,
  occupation TEXT,
  -- Banking (for Contas a Pagar automation)
  bank_code TEXT,
  bank_name TEXT,
  agency TEXT,
  account TEXT,
  account_type TEXT CHECK (account_type IN ('corrente', 'poupanca')) DEFAULT 'corrente',
  pix_key TEXT,
  pix_key_type TEXT CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
  -- Roles (denormalized booleans for simplicity + performance)
  is_client BOOLEAN DEFAULT false,
  is_supplier BOOLEAN DEFAULT false,
  is_seller BOOLEAN DEFAULT false,
  is_investor BOOLEAN DEFAULT false,
  -- Seller-specific
  commission_rate NUMERIC(5,2),
  commission_pay_rule TEXT DEFAULT 'D+5',
  seller_active BOOLEAN DEFAULT true,
  -- Investor-specific
  investor_roi_type TEXT CHECK (investor_roi_type IN ('fixed_monthly', 'net_profit', 'revenue_share')),
  investor_roi_rate NUMERIC(5,2),
  -- Metadata
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for entities
CREATE INDEX IF NOT EXISTS idx_entities_user_id ON public.entities(user_id);
CREATE INDEX IF NOT EXISTS idx_entities_document_num ON public.entities(document_num);
CREATE INDEX IF NOT EXISTS idx_entities_is_client ON public.entities(is_client) WHERE is_client = true;
CREATE INDEX IF NOT EXISTS idx_entities_is_supplier ON public.entities(is_supplier) WHERE is_supplier = true;
CREATE INDEX IF NOT EXISTS idx_entities_is_seller ON public.entities(is_seller) WHERE is_seller = true;
CREATE INDEX IF NOT EXISTS idx_entities_is_investor ON public.entities(is_investor) WHERE is_investor = true;
CREATE INDEX IF NOT EXISTS idx_entities_deleted_at ON public.entities(deleted_at);

-- ============================================================================
-- 2. ENTITY RELATIONSHIPS TABLE (N:N auto-reference for business partners)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.entity_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  child_entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('partner', 'representative', 'dependent', 'guarantor')),
  equity_percentage NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parent_entity_id, child_entity_id, relationship_type)
);

-- ============================================================================
-- 3. CHART OF ACCOUNTS TABLE (3-level hierarchy with DRE mapping)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
  parent_id UUID REFERENCES public.chart_of_accounts(id),
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  dre_mapping_key TEXT,
  dre_order INTEGER,
  is_system BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_chart_of_accounts_user_code'
      AND conrelid = 'public.chart_of_accounts'::regclass
  ) THEN
    ALTER TABLE public.chart_of_accounts
      ADD CONSTRAINT uq_chart_of_accounts_user_code UNIQUE (user_id, code);
  END IF;
END$$;

-- ============================================================================
-- 4. SEED FUNCTION FOR DEFAULT CHART OF ACCOUNTS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.seed_chart_of_accounts(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receitas_id UUID;
  v_despesas_id UUID;
  v_rec_oper_id UUID;
  v_rec_outras_id UUID;
  v_desp_cmv_id UUID;
  v_desp_fixas_id UUID;
  v_desp_var_id UUID;
  v_desp_fin_id UUID;
  v_desp_invest_id UUID;
BEGIN
  -- Check if user already has chart of accounts
  IF EXISTS (SELECT 1 FROM public.chart_of_accounts WHERE user_id = p_user_id LIMIT 1) THEN
    RETURN;
  END IF;

  -- ---- LEVEL 1 ----

  INSERT INTO public.chart_of_accounts (id, user_id, code, name, level, parent_id, type, is_system)
  VALUES (gen_random_uuid(), p_user_id, '1', 'Receitas', 1, NULL, 'income', true)
  RETURNING id INTO v_receitas_id;

  INSERT INTO public.chart_of_accounts (id, user_id, code, name, level, parent_id, type, is_system)
  VALUES (gen_random_uuid(), p_user_id, '2', 'Despesas', 1, NULL, 'expense', true)
  RETURNING id INTO v_despesas_id;

  -- ---- LEVEL 2: Income groups ----

  INSERT INTO public.chart_of_accounts (id, user_id, code, name, level, parent_id, type, is_system)
  VALUES (gen_random_uuid(), p_user_id, '1.1', 'Receitas Operacionais', 2, v_receitas_id, 'income', true)
  RETURNING id INTO v_rec_oper_id;

  INSERT INTO public.chart_of_accounts (id, user_id, code, name, level, parent_id, type, is_system)
  VALUES (gen_random_uuid(), p_user_id, '1.2', 'Outras Receitas', 2, v_receitas_id, 'income', true)
  RETURNING id INTO v_rec_outras_id;

  -- ---- LEVEL 2: Expense groups ----

  INSERT INTO public.chart_of_accounts (id, user_id, code, name, level, parent_id, type, is_system)
  VALUES (gen_random_uuid(), p_user_id, '2.1', 'CMV', 2, v_despesas_id, 'expense', true)
  RETURNING id INTO v_desp_cmv_id;

  INSERT INTO public.chart_of_accounts (id, user_id, code, name, level, parent_id, type, is_system)
  VALUES (gen_random_uuid(), p_user_id, '2.2', 'Despesas Fixas', 2, v_despesas_id, 'expense', true)
  RETURNING id INTO v_desp_fixas_id;

  INSERT INTO public.chart_of_accounts (id, user_id, code, name, level, parent_id, type, is_system)
  VALUES (gen_random_uuid(), p_user_id, '2.3', 'Despesas Variáveis', 2, v_despesas_id, 'expense', true)
  RETURNING id INTO v_desp_var_id;

  INSERT INTO public.chart_of_accounts (id, user_id, code, name, level, parent_id, type, is_system)
  VALUES (gen_random_uuid(), p_user_id, '2.4', 'Despesas Financeiras', 2, v_despesas_id, 'expense', true)
  RETURNING id INTO v_desp_fin_id;

  INSERT INTO public.chart_of_accounts (id, user_id, code, name, level, parent_id, type, is_system)
  VALUES (gen_random_uuid(), p_user_id, '2.5', 'Investidores', 2, v_despesas_id, 'expense', true)
  RETURNING id INTO v_desp_invest_id;

  -- ---- LEVEL 3: Income categories ----

  -- 1.1 Receitas Operacionais
  INSERT INTO public.chart_of_accounts (user_id, code, name, level, parent_id, type, dre_mapping_key, dre_order, is_system)
  VALUES
    (p_user_id, '1.1.01', 'Venda de Veículos', 3, v_rec_oper_id, 'income', 'RECEITA_BRUTA_VENDA', 10, true),
    (p_user_id, '1.1.02', 'Serviços', 3, v_rec_oper_id, 'income', 'RECEITA_SERVICOS', 20, true),
    (p_user_id, '1.1.03', 'Comissões Recebidas', 3, v_rec_oper_id, 'income', 'RECEITA_COMISSOES', 30, true);

  -- 1.2 Outras Receitas
  INSERT INTO public.chart_of_accounts (user_id, code, name, level, parent_id, type, dre_mapping_key, dre_order, is_system)
  VALUES
    (p_user_id, '1.2.01', 'Juros Recebidos', 3, v_rec_outras_id, 'income', 'RECEITA_FINANCEIRA_JUROS', 40, true),
    (p_user_id, '1.2.02', 'Outras Receitas', 3, v_rec_outras_id, 'income', 'OUTRAS_RECEITAS', 50, true);

  -- ---- LEVEL 3: Expense categories ----

  -- 2.1 CMV
  INSERT INTO public.chart_of_accounts (user_id, code, name, level, parent_id, type, dre_mapping_key, dre_order, is_system)
  VALUES
    (p_user_id, '2.1.01', 'Custo Aquisição Veículo', 3, v_desp_cmv_id, 'expense', 'CMV_VEICULO', 100, true),
    (p_user_id, '2.1.02', 'Oficina/Reparos', 3, v_desp_cmv_id, 'expense', 'CMV_OFICINA', 110, true),
    (p_user_id, '2.1.03', 'Documentação/Transferência', 3, v_desp_cmv_id, 'expense', 'CMV_DOCUMENTACAO', 120, true),
    (p_user_id, '2.1.04', 'Despachante', 3, v_desp_cmv_id, 'expense', 'CMV_DESPACHANTE', 130, true),
    (p_user_id, '2.1.05', 'Frete/Guincho', 3, v_desp_cmv_id, 'expense', 'CMV_FRETE', 140, true);

  -- 2.2 Despesas Fixas
  INSERT INTO public.chart_of_accounts (user_id, code, name, level, parent_id, type, dre_mapping_key, dre_order, is_system)
  VALUES
    (p_user_id, '2.2.01', 'Aluguel', 3, v_desp_fixas_id, 'expense', 'DESPESA_FIXA_ALUGUEL', 200, true),
    (p_user_id, '2.2.02', 'Energia', 3, v_desp_fixas_id, 'expense', 'DESPESA_FIXA_ENERGIA', 210, true),
    (p_user_id, '2.2.03', 'Internet/Telefone', 3, v_desp_fixas_id, 'expense', 'DESPESA_FIXA_TELECOM', 220, true),
    (p_user_id, '2.2.04', 'Salários', 3, v_desp_fixas_id, 'expense', 'DESPESA_FIXA_SALARIOS', 230, true),
    (p_user_id, '2.2.05', 'Contabilidade', 3, v_desp_fixas_id, 'expense', 'DESPESA_FIXA_CONTABILIDADE', 240, true),
    (p_user_id, '2.2.06', 'Seguro do Pátio', 3, v_desp_fixas_id, 'expense', 'DESPESA_FIXA_SEGURO', 250, true);

  -- 2.3 Despesas Variáveis
  INSERT INTO public.chart_of_accounts (user_id, code, name, level, parent_id, type, dre_mapping_key, dre_order, is_system)
  VALUES
    (p_user_id, '2.3.01', 'Comissões Vendedores', 3, v_desp_var_id, 'expense', 'DESPESA_VAR_COMISSAO', 300, true),
    (p_user_id, '2.3.02', 'Marketing/Anúncios', 3, v_desp_var_id, 'expense', 'DESPESA_VAR_MARKETING', 310, true),
    (p_user_id, '2.3.03', 'Combustível', 3, v_desp_var_id, 'expense', 'DESPESA_VAR_COMBUSTIVEL', 320, true);

  -- 2.4 Despesas Financeiras
  INSERT INTO public.chart_of_accounts (user_id, code, name, level, parent_id, type, dre_mapping_key, dre_order, is_system)
  VALUES
    (p_user_id, '2.4.01', 'Juros Pagos', 3, v_desp_fin_id, 'expense', 'DESPESA_FINANCEIRA_JUROS', 400, true),
    (p_user_id, '2.4.02', 'Tarifas Bancárias', 3, v_desp_fin_id, 'expense', 'DESPESA_FINANCEIRA_TARIFAS', 410, true),
    (p_user_id, '2.4.03', 'Impostos', 3, v_desp_fin_id, 'expense', 'DESPESA_IMPOSTOS', 420, true);

  -- 2.5 Investidores
  INSERT INTO public.chart_of_accounts (user_id, code, name, level, parent_id, type, dre_mapping_key, dre_order, is_system)
  VALUES
    (p_user_id, '2.5.01', 'Repasse Investidor', 3, v_desp_invest_id, 'expense', 'DESPESA_REPASSE_INVESTIDOR', 500, true),
    (p_user_id, '2.5.02', 'ROI Investidor', 3, v_desp_invest_id, 'expense', 'DESPESA_ROI_INVESTIDOR', 510, true);

END;
$$;

-- ============================================================================
-- 5. FINANCIAL TRANSACTIONS TABLE (Unified)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  -- The Relational Triad
  account_category_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  entity_id UUID NOT NULL REFERENCES public.entities(id),
  vehicle_id UUID REFERENCES public.products(id),
  -- Money
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  due_date DATE NOT NULL,
  payment_date DATE,
  status TEXT NOT NULL CHECK (status IN ('open', 'partial', 'paid', 'overdue', 'cancelled')) DEFAULT 'open',
  -- Payment details
  payment_method TEXT,
  installment_number INTEGER,
  installment_total INTEGER,
  parent_transaction_id UUID REFERENCES public.financial_transactions(id),
  -- Refund engine
  is_refundable BOOLEAN DEFAULT false,
  refund_target_entity_id UUID REFERENCES public.entities(id),
  -- Commission link
  commission_source_transaction_id UUID REFERENCES public.financial_transactions(id),
  seller_entity_id UUID REFERENCES public.entities(id),
  -- Metadata
  description TEXT,
  notes TEXT,
  document_url TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for financial_transactions
CREATE INDEX IF NOT EXISTS idx_fin_tx_user_id ON public.financial_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_fin_tx_entity_id ON public.financial_transactions(entity_id);
CREATE INDEX IF NOT EXISTS idx_fin_tx_vehicle_id ON public.financial_transactions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fin_tx_account_category_id ON public.financial_transactions(account_category_id);
CREATE INDEX IF NOT EXISTS idx_fin_tx_status ON public.financial_transactions(status);
CREATE INDEX IF NOT EXISTS idx_fin_tx_due_date ON public.financial_transactions(due_date);
CREATE INDEX IF NOT EXISTS idx_fin_tx_type ON public.financial_transactions(type);
CREATE INDEX IF NOT EXISTS idx_fin_tx_deleted_at ON public.financial_transactions(deleted_at);

-- ============================================================================
-- 6. UPDATE PRODUCTS TABLE (Vehicle status machine + extra fields)
-- ============================================================================

-- Add status column
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add CHECK constraint for status (safe: drop if exists first)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_status_check'
    AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_status_check
      CHECK (status IN ('shadow_inventory', 'quarantine', 'active', 'sold', 'archived'));
  END IF;
END$$;

-- Migrate existing data
UPDATE public.products SET status = 'sold' WHERE sold = true AND (status IS NULL OR status = 'active');
UPDATE public.products SET status = 'active' WHERE (sold = false OR sold IS NULL) AND status IS NULL;

-- Add extra vehicle fields from PRD
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS chassis TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS fuel TEXT,
  ADD COLUMN IF NOT EXISTS transmission TEXT,
  ADD COLUMN IF NOT EXISTS doors INTEGER,
  ADD COLUMN IF NOT EXISTS is_marketplace_visible BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================================
-- 7. VEHICLE OWNERS TABLE (N:N multiproprietorship)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vehicle_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  equity_percentage NUMERIC(5,2) NOT NULL DEFAULT 100.00 CHECK (equity_percentage > 0 AND equity_percentage <= 100),
  ownership_type TEXT NOT NULL CHECK (ownership_type IN ('own', 'consigned', 'investor')) DEFAULT 'own',
  entry_date DATE DEFAULT CURRENT_DATE,
  exit_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(vehicle_id, entity_id)
);

-- ============================================================================
-- 8. CRM LEADS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  contact_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  origin TEXT CHECK (origin IN ('marketplace', 'whatsapp', 'phone', 'walk_in', 'website', 'referral', 'other')) DEFAULT 'other',
  status_step TEXT NOT NULL CHECK (status_step IN ('new', 'contacted', 'qualified', 'negotiation', 'proposal', 'converted', 'lost')) DEFAULT 'new',
  vehicle_interest_id UUID REFERENCES public.products(id),
  assigned_seller_id UUID REFERENCES public.entities(id),
  converted_entity_id UUID REFERENCES public.entities(id),
  notes TEXT,
  lost_reason TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 9. ATTACHMENTS TABLE (GED Polimórfico)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  attachable_type TEXT NOT NULL CHECK (attachable_type IN ('entity', 'vehicle', 'transaction')),
  attachable_id UUID NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attachments_polymorphic ON public.attachments(attachable_type, attachable_id);

-- ============================================================================
-- 10. CONTRACTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  contract_type TEXT NOT NULL CHECK (contract_type IN ('CONSIGNMENT_IN', 'PURCHASE_IN', 'SALE_OUT', 'SERVICE_ORDER')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'registered', 'cancelled')) DEFAULT 'draft',
  -- Parties
  entity_id UUID NOT NULL REFERENCES public.entities(id),
  secondary_entity_id UUID REFERENCES public.entities(id),
  vehicle_id UUID REFERENCES public.products(id),
  -- Values
  total_value NUMERIC(12,2),
  down_payment NUMERIC(12,2),
  financing_value NUMERIC(12,2),
  trade_in_vehicle_id UUID REFERENCES public.products(id),
  trade_in_value NUMERIC(12,2),
  -- Terms
  warranty_months INTEGER,
  warranty_km INTEGER,
  payment_method TEXT,
  installments INTEGER,
  -- Template
  template_id UUID,
  generated_pdf_url TEXT,
  -- Registration
  registered_at TIMESTAMPTZ,
  registered_by UUID REFERENCES auth.users(id),
  -- Metadata
  sign_date DATE,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 11. SYS AUDIT LOGS TABLE (Immutable)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sys_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  payload_before JSONB,
  payload_after JSONB,
  ip_address TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- No UPDATE or DELETE allowed on this table (enforced at RLS level)
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON public.sys_audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.sys_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.sys_audit_logs(created_at);

-- ============================================================================
-- 12. ROW LEVEL SECURITY
-- ============================================================================

-- entities
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own entities" ON public.entities;
CREATE POLICY "Users manage own entities" ON public.entities
  FOR ALL USING (auth.uid() = user_id);

-- entity_relationships (no user_id: check via parent entity)
ALTER TABLE public.entity_relationships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own entity_relationships" ON public.entity_relationships;
CREATE POLICY "Users manage own entity_relationships" ON public.entity_relationships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.entities
      WHERE entities.id = entity_relationships.parent_entity_id
      AND entities.user_id = auth.uid()
    )
  );

-- chart_of_accounts
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own chart_of_accounts" ON public.chart_of_accounts;
CREATE POLICY "Users manage own chart_of_accounts" ON public.chart_of_accounts
  FOR ALL USING (auth.uid() = user_id);

-- financial_transactions
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own financial_transactions" ON public.financial_transactions;
CREATE POLICY "Users manage own financial_transactions" ON public.financial_transactions
  FOR ALL USING (auth.uid() = user_id);

-- vehicle_owners (no user_id: check via vehicle's user_id)
ALTER TABLE public.vehicle_owners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own vehicle_owners" ON public.vehicle_owners;
CREATE POLICY "Users manage own vehicle_owners" ON public.vehicle_owners
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = vehicle_owners.vehicle_id
      AND products.user_id = auth.uid()
    )
  );

-- crm_leads
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own crm_leads" ON public.crm_leads;
CREATE POLICY "Users manage own crm_leads" ON public.crm_leads
  FOR ALL USING (auth.uid() = user_id);

-- attachments
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own attachments" ON public.attachments;
CREATE POLICY "Users manage own attachments" ON public.attachments
  FOR ALL USING (auth.uid() = user_id);

-- contracts
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own contracts" ON public.contracts;
CREATE POLICY "Users manage own contracts" ON public.contracts
  FOR ALL USING (auth.uid() = user_id);

-- sys_audit_logs (read-only for user, insert via service role or triggers)
ALTER TABLE public.sys_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own audit_logs" ON public.sys_audit_logs;
CREATE POLICY "Users can view own audit_logs" ON public.sys_audit_logs
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert audit_logs" ON public.sys_audit_logs;
CREATE POLICY "Users can insert audit_logs" ON public.sys_audit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 13. HELPER FUNCTIONS & TRIGGERS
-- ============================================================================

-- update_updated_at_column trigger function (create if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers (DROP IF EXISTS first to be idempotent)
DROP TRIGGER IF EXISTS trg_entities_updated_at ON public.entities;
CREATE TRIGGER trg_entities_updated_at
  BEFORE UPDATE ON public.entities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_financial_transactions_updated_at ON public.financial_transactions;
CREATE TRIGGER trg_financial_transactions_updated_at
  BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_crm_leads_updated_at ON public.crm_leads;
CREATE TRIGGER trg_crm_leads_updated_at
  BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_contracts_updated_at ON public.contracts;
CREATE TRIGGER trg_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 14. DATA MIGRATION FROM OLD TABLES
-- ============================================================================

-- Migrate customers to entities
INSERT INTO public.entities (user_id, document_num, document_type, name, email, phone, is_client, created_at, updated_at)
SELECT
  c.user_id,
  COALESCE(c.cpf, c.cnpj),
  COALESCE(c.document_type, 'CPF'),
  c.name,
  c.email,
  c.phone,
  true,
  c.created_at,
  c.updated_at
FROM public.customers c
WHERE COALESCE(c.cpf, c.cnpj) IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.entities e
  WHERE e.document_num = COALESCE(c.cpf, c.cnpj)
  AND e.user_id = c.user_id
)
ON CONFLICT (document_num) DO NOTHING;

-- Migrate customers without documents (use email as fallback, skip document_num)
INSERT INTO public.entities (user_id, name, email, phone, is_client, created_at, updated_at)
SELECT
  c.user_id,
  c.name,
  c.email,
  c.phone,
  true,
  c.created_at,
  c.updated_at
FROM public.customers c
WHERE c.cpf IS NULL AND c.cnpj IS NULL;

-- Migrate salespeople to entities
INSERT INTO public.entities (user_id, document_num, document_type, name, email, phone, is_seller, commission_rate, seller_active, created_at, updated_at)
SELECT
  s.user_id,
  s.cpf,
  'CPF',
  s.name,
  s.email,
  s.phone,
  true,
  s.commission_rate,
  s.active,
  s.created_at,
  s.updated_at
FROM public.salespeople s
WHERE s.cpf IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.entities e
  WHERE e.document_num = s.cpf
  AND e.user_id = s.user_id
)
ON CONFLICT (document_num) DO NOTHING;

-- For salespeople without CPF, insert without document_num
INSERT INTO public.entities (user_id, name, email, phone, is_seller, commission_rate, seller_active, created_at, updated_at)
SELECT
  s.user_id,
  s.name,
  s.email,
  s.phone,
  true,
  s.commission_rate,
  s.active,
  s.created_at,
  s.updated_at
FROM public.salespeople s
WHERE s.cpf IS NULL;

COMMIT;
