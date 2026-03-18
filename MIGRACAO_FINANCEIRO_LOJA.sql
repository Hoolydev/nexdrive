-- =============================================
-- MIGRAÇÃO: Módulo Financeiro + Loja Virtual
-- Idempotente: pode executar várias vezes sem erro
-- =============================================

-- =============================================
-- 1. VENDEDORES
-- =============================================
CREATE TABLE IF NOT EXISTS public.salespeople (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  cpf TEXT,
  commission_rate NUMERIC(5,2) DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.salespeople ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own salespeople" ON public.salespeople;
CREATE POLICY "Users can view own salespeople" ON public.salespeople
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own salespeople" ON public.salespeople;
CREATE POLICY "Users can insert own salespeople" ON public.salespeople
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own salespeople" ON public.salespeople;
CREATE POLICY "Users can update own salespeople" ON public.salespeople
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own salespeople" ON public.salespeople;
CREATE POLICY "Users can delete own salespeople" ON public.salespeople
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 2. CATEGORIAS FINANCEIRAS
-- =============================================
CREATE TABLE IF NOT EXISTS public.financial_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own financial_categories" ON public.financial_categories;
CREATE POLICY "Users can view own financial_categories" ON public.financial_categories
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own financial_categories" ON public.financial_categories;
CREATE POLICY "Users can insert own financial_categories" ON public.financial_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own financial_categories" ON public.financial_categories;
CREATE POLICY "Users can update own financial_categories" ON public.financial_categories
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own financial_categories" ON public.financial_categories;
CREATE POLICY "Users can delete own financial_categories" ON public.financial_categories
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 3. COMISSÕES
-- =============================================
CREATE TABLE IF NOT EXISTS public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  salesperson_id UUID REFERENCES public.salespeople(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  commission_type TEXT NOT NULL CHECK (commission_type IN ('percentage', 'fixed')),
  commission_value NUMERIC(12,2) NOT NULL,
  calculated_amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  payment_date DATE,
  sale_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own commissions" ON public.commissions;
CREATE POLICY "Users can view own commissions" ON public.commissions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own commissions" ON public.commissions;
CREATE POLICY "Users can insert own commissions" ON public.commissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own commissions" ON public.commissions;
CREATE POLICY "Users can update own commissions" ON public.commissions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own commissions" ON public.commissions;
CREATE POLICY "Users can delete own commissions" ON public.commissions
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 4. CONTAS A PAGAR
-- =============================================
CREATE TABLE IF NOT EXISTS public.accounts_payable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'overdue', 'paid')),
  is_recurring BOOLEAN DEFAULT false,
  recurrence_interval TEXT CHECK (recurrence_interval IN ('monthly', 'weekly', 'yearly')),
  recurrence_end_date DATE,
  parent_id UUID REFERENCES public.accounts_payable(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own accounts_payable" ON public.accounts_payable;
CREATE POLICY "Users can view own accounts_payable" ON public.accounts_payable
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own accounts_payable" ON public.accounts_payable;
CREATE POLICY "Users can insert own accounts_payable" ON public.accounts_payable
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own accounts_payable" ON public.accounts_payable;
CREATE POLICY "Users can update own accounts_payable" ON public.accounts_payable
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own accounts_payable" ON public.accounts_payable;
CREATE POLICY "Users can delete own accounts_payable" ON public.accounts_payable
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 5. CONTAS A RECEBER
-- =============================================
CREATE TABLE IF NOT EXISTS public.accounts_receivable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  installments INTEGER DEFAULT 1,
  payment_method TEXT CHECK (payment_method IN ('cash', 'financing', 'credit_card', 'pix', 'boleto', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own accounts_receivable" ON public.accounts_receivable;
CREATE POLICY "Users can view own accounts_receivable" ON public.accounts_receivable
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own accounts_receivable" ON public.accounts_receivable;
CREATE POLICY "Users can insert own accounts_receivable" ON public.accounts_receivable
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own accounts_receivable" ON public.accounts_receivable;
CREATE POLICY "Users can update own accounts_receivable" ON public.accounts_receivable
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own accounts_receivable" ON public.accounts_receivable;
CREATE POLICY "Users can delete own accounts_receivable" ON public.accounts_receivable
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 6. PARCELAS (INSTALLMENTS)
-- =============================================
CREATE TABLE IF NOT EXISTS public.receivable_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_id UUID REFERENCES public.accounts_receivable(id) ON DELETE CASCADE NOT NULL,
  installment_number INTEGER NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.receivable_installments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own installments" ON public.receivable_installments;
CREATE POLICY "Users can manage own installments" ON public.receivable_installments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.accounts_receivable ar
      WHERE ar.id = receivable_installments.receivable_id
      AND ar.user_id = auth.uid()
    )
  );

-- =============================================
-- 7. CONFIGURAÇÕES DA LOJA VIRTUAL
-- =============================================
CREATE TABLE IF NOT EXISTS public.store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  store_name TEXT NOT NULL DEFAULT 'Minha Loja',
  slug TEXT UNIQUE,
  logo_url TEXT,
  banner_url TEXT,
  primary_color TEXT DEFAULT '#1e40af',
  secondary_color TEXT DEFAULT '#ffffff',
  whatsapp_number TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Owner pode gerenciar
DROP POLICY IF EXISTS "Users can view own store_settings" ON public.store_settings;
CREATE POLICY "Users can view own store_settings" ON public.store_settings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own store_settings" ON public.store_settings;
CREATE POLICY "Users can insert own store_settings" ON public.store_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own store_settings" ON public.store_settings;
CREATE POLICY "Users can update own store_settings" ON public.store_settings
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own store_settings" ON public.store_settings;
CREATE POLICY "Users can delete own store_settings" ON public.store_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Público pode ver lojas ativas
DROP POLICY IF EXISTS "Public can view active stores" ON public.store_settings;
CREATE POLICY "Public can view active stores" ON public.store_settings
  FOR SELECT USING (active = true);

-- =============================================
-- 8. ACESSO PÚBLICO AOS PRODUTOS (LOJA VIRTUAL)
-- =============================================
-- Permitir leitura pública de veículos não vendidos
-- Mantém acesso do owner a todos os seus veículos
DROP POLICY IF EXISTS "Public can view unsold products" ON public.products;
CREATE POLICY "Public can view unsold products" ON public.products
  FOR SELECT USING (sold = false OR sold IS NULL OR auth.uid() = user_id);

-- =============================================
-- 9. TRIGGERS updated_at
-- =============================================
DROP TRIGGER IF EXISTS update_salespeople_updated_at ON public.salespeople;
CREATE TRIGGER update_salespeople_updated_at
  BEFORE UPDATE ON public.salespeople
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_commissions_updated_at ON public.commissions;
CREATE TRIGGER update_commissions_updated_at
  BEFORE UPDATE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_accounts_payable_updated_at ON public.accounts_payable;
CREATE TRIGGER update_accounts_payable_updated_at
  BEFORE UPDATE ON public.accounts_payable
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_accounts_receivable_updated_at ON public.accounts_receivable;
CREATE TRIGGER update_accounts_receivable_updated_at
  BEFORE UPDATE ON public.accounts_receivable
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_store_settings_updated_at ON public.store_settings;
CREATE TRIGGER update_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
