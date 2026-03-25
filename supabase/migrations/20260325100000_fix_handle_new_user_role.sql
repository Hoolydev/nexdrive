-- Fix handle_new_user to read role and owner_id from user metadata
-- when a team member is created by an owner via the admin API.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_owner_id UUID;
  v_display_name TEXT;
BEGIN
  -- Read metadata if provided (team member creation via admin API)
  v_role        := COALESCE(new.raw_user_meta_data->>'role', 'owner');
  v_display_name := new.raw_user_meta_data->>'display_name';

  -- Validate role value; fall back to owner if unexpected value
  IF v_role NOT IN ('owner', 'manager', 'seller') THEN
    v_role := 'owner';
  END IF;

  -- owner_id from metadata (only set for team members)
  BEGIN
    v_owner_id := (new.raw_user_meta_data->>'owner_id')::UUID;
  EXCEPTION WHEN others THEN
    v_owner_id := NULL;
  END;

  INSERT INTO public.profiles (id, email, role, owner_id, display_name)
  VALUES (new.id, new.email, v_role, v_owner_id, v_display_name);

  RETURN new;
END;
$$;
