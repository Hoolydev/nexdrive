-- ============================================
-- FIX: Infinite recursion in profiles RLS
-- ============================================
-- Problem: policies on "profiles" subquery "profiles" → infinite loop
-- Fix: use SECURITY DEFINER functions that bypass RLS

-- 1. Helper function: get current user's owner_id (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_my_owner_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT owner_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Helper function: get current user's role (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 3. Drop the broken policies
DROP POLICY IF EXISTS "Users can view own and team profiles" ON public.profiles;
DROP POLICY IF EXISTS "Owners can update team member profiles" ON public.profiles;
DROP POLICY IF EXISTS "Owners can insert team members" ON public.profiles;
DROP POLICY IF EXISTS "Owners can delete team members" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Also drop the broken products/customers policies
DROP POLICY IF EXISTS "Users can view own or owner products" ON public.products;
DROP POLICY IF EXISTS "Users can view own or owner customers" ON public.customers;
DROP POLICY IF EXISTS "Users can insert customers" ON public.customers;

-- 4. Recreate profiles policies using helper functions (no recursion)
CREATE POLICY "Users can view own and team profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR owner_id = auth.uid()
    OR id = public.get_my_owner_id()
    OR (
      public.get_my_owner_id() IS NOT NULL
      AND owner_id = public.get_my_owner_id()
    )
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Owners can update team member profiles"
  ON public.profiles FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can insert team members"
  ON public.profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id
    OR public.get_my_role() = 'owner'
  );

CREATE POLICY "Owners can delete team members"
  ON public.profiles FOR DELETE
  USING (owner_id = auth.uid());

-- 5. Recreate products policies using helper functions
CREATE POLICY "Users can view own or owner products"
  ON public.products FOR SELECT
  USING (
    auth.uid() = user_id
    OR user_id = public.get_my_owner_id()
  );

-- 6. Recreate customers policies using helper functions
CREATE POLICY "Users can view own or owner customers"
  ON public.customers FOR SELECT
  USING (
    auth.uid() = user_id
    OR user_id = public.get_my_owner_id()
  );

CREATE POLICY "Users can insert customers"
  ON public.customers FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR user_id = public.get_my_owner_id()
  );
