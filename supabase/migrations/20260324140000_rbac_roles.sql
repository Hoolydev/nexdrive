-- ============================================
-- RBAC: Role-Based Access Control
-- ============================================
-- Roles: owner (dono), manager (gestor), seller (vendedor)
-- owner_id: links team members to their owner

-- 1. Add columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'owner' CHECK (role IN ('owner','manager','seller')),
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 2. Update existing users to be owners
UPDATE public.profiles SET role = 'owner' WHERE role IS NULL;

-- 3. Drop old restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 4. New RLS policies for team visibility
CREATE POLICY "Users can view own and team profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id 
    OR owner_id = auth.uid() 
    OR id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid())
    OR (
      (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid()) IS NOT NULL
      AND owner_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid())
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
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner')
    )
  );

CREATE POLICY "Owners can delete team members"
  ON public.profiles FOR DELETE
  USING (owner_id = auth.uid());

-- 5. Allow team members to access owner's data
-- Products: team members can see products of their owner
DROP POLICY IF EXISTS "Users can view own products" ON public.products;
CREATE POLICY "Users can view own or owner products"
  ON public.products FOR SELECT
  USING (
    auth.uid() = user_id 
    OR user_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- Customers: team members can see owner's customers
DROP POLICY IF EXISTS "Users can view own customers" ON public.customers;
CREATE POLICY "Users can view own or owner customers"
  ON public.customers FOR SELECT
  USING (
    auth.uid() = user_id 
    OR user_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- Allow team members to insert customers under owner's user_id
DROP POLICY IF EXISTS "Users can insert own customers" ON public.customers;
CREATE POLICY "Users can insert customers"
  ON public.customers FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    OR user_id = (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- Update handle_new_user to include role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'owner');
  RETURN new;
END;
$$;
