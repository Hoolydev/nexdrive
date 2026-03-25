-- RPC function to create a team member (manager/seller) without email confirmation.
-- Runs as SECURITY DEFINER so it can write to auth.users and auth.identities.
-- Called from the frontend via supabase.rpc('create_team_member', {...}).

CREATE OR REPLACE FUNCTION public.create_team_member(
  p_email       TEXT,
  p_password    TEXT,
  p_display_name TEXT,
  p_role        TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_owner_id        UUID;
  v_owner_role      TEXT;
  v_user_id         UUID;
  v_encrypted_pass  TEXT;
BEGIN
  -- Identify caller
  v_owner_id := auth.uid();
  IF v_owner_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Não autenticado');
  END IF;

  -- Must be owner
  SELECT role INTO v_owner_role FROM public.profiles WHERE id = v_owner_id;
  IF v_owner_role IS DISTINCT FROM 'owner' THEN
    RETURN jsonb_build_object('error', 'Apenas o Dono pode cadastrar membros');
  END IF;

  -- Validate role
  IF p_role NOT IN ('manager', 'seller') THEN
    RETURN jsonb_build_object('error', 'Função inválida. Use: manager ou seller');
  END IF;

  -- Check email not already registered
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = lower(p_email)) THEN
    RETURN jsonb_build_object('error', 'Este email já está cadastrado');
  END IF;

  -- Generate user id and hash password
  v_user_id        := gen_random_uuid();
  v_encrypted_pass := crypt(p_password, gen_salt('bf'));

  -- Insert into auth.users with email_confirmed_at set (skips confirmation)
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    raw_app_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  )
  VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    lower(p_email),
    v_encrypted_pass,
    now(),                          -- confirmed immediately
    jsonb_build_object(
      'display_name', p_display_name,
      'role',         p_role,
      'owner_id',     v_owner_id::text
    ),
    '{"provider":"email","providers":["email"]}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- Insert identity (required by Supabase Auth)
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_user_id,
    lower(p_email),
    jsonb_build_object('sub', v_user_id::text, 'email', lower(p_email)),
    'email',
    now(),
    now(),
    now()
  );

  -- Upsert profile (trigger may have already created it; set correct values)
  INSERT INTO public.profiles (id, email, role, owner_id, display_name)
  VALUES (v_user_id, lower(p_email), p_role, v_owner_id, p_display_name)
  ON CONFLICT (id) DO UPDATE SET
    role         = EXCLUDED.role,
    owner_id     = EXCLUDED.owner_id,
    display_name = EXCLUDED.display_name;

  RETURN jsonb_build_object('success', true, 'user_id', v_user_id);
END;
$$;

-- Only authenticated users can call it (RLS on auth.users handled inside the function)
GRANT EXECUTE ON FUNCTION public.create_team_member(TEXT, TEXT, TEXT, TEXT) TO authenticated;
