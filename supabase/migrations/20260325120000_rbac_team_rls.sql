-- ============================================================
-- RBAC: Allow team members (manager/seller) to access owner's data
-- Extends RLS policies on tables not covered by the initial RBAC migration.
-- Pattern: user_id = auth.uid() OR user_id = owner_id of the caller.
-- ============================================================

-- Helper: reusable expression to check if caller is a team member of the row owner
-- (auth.uid() = user_id) OR (user_id is the owner of the current user)

-- ── crm_funnels ────────────────────────────────────────────
DROP POLICY IF EXISTS "Users manage own funnels" ON public.crm_funnels;
CREATE POLICY "Users manage own funnels"
  ON public.crm_funnels FOR ALL
  USING (
    auth.uid() = user_id
    OR user_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    OR user_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- ── crm_funnel_stages ──────────────────────────────────────
DROP POLICY IF EXISTS "Users manage own funnel stages" ON public.crm_funnel_stages;
CREATE POLICY "Users manage own funnel stages"
  ON public.crm_funnel_stages FOR ALL
  USING (
    funnel_id IN (
      SELECT id FROM public.crm_funnels
      WHERE user_id = auth.uid()
         OR user_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid())
    )
  )
  WITH CHECK (
    funnel_id IN (
      SELECT id FROM public.crm_funnels
      WHERE user_id = auth.uid()
         OR user_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid())
    )
  );

-- ── crm_leads ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Users manage own crm_leads" ON public.crm_leads;
CREATE POLICY "Users manage own crm_leads"
  ON public.crm_leads FOR ALL
  USING (
    auth.uid() = user_id
    OR user_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    OR user_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- ── entities ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Users manage own entities" ON public.entities;
CREATE POLICY "Users manage own entities"
  ON public.entities FOR ALL
  USING (
    auth.uid() = user_id
    OR user_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    OR user_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- ── customers ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can view own or owner customers" ON public.customers;
DROP POLICY IF EXISTS "Users can insert own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can insert customers" ON public.customers;

CREATE POLICY "Users manage own or owner customers"
  ON public.customers FOR ALL
  USING (
    auth.uid() = user_id
    OR user_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    OR user_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- ── financial_transactions ─────────────────────────────────
DROP POLICY IF EXISTS "Users manage own transactions" ON public.financial_transactions;
CREATE POLICY "Users manage own or owner transactions"
  ON public.financial_transactions FOR ALL
  USING (
    auth.uid() = user_id
    OR user_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    OR user_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- ── products (ensure both policies don't conflict) ─────────
DROP POLICY IF EXISTS "Users can view own products" ON public.products;
DROP POLICY IF EXISTS "Users can view own or owner products" ON public.products;

CREATE POLICY "Users manage own or owner products"
  ON public.products FOR ALL
  USING (
    auth.uid() = user_id
    OR user_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    OR user_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid())
  );
