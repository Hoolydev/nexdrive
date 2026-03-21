BEGIN;

-- Trigger que chama seed_chart_of_accounts quando um novo usuário se cadastra
CREATE OR REPLACE FUNCTION public.handle_new_user_seed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Seed chart of accounts for the new user
  PERFORM public.seed_chart_of_accounts(NEW.id);
  RETURN NEW;
END;
$$;

-- Aplica na tabela auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_seed ON auth.users;
CREATE TRIGGER on_auth_user_created_seed
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_seed();

COMMIT;
