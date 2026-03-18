-- GARANTIR ACESSO BÁSICO DE VOLTA AOS CLIENTES (authenticated & anon)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- CRIAR AS COLUNAS DOS PRODUTOS SE FALTAR ALGUMA
ALTER TABLE IF EXISTS public.products
ADD COLUMN IF NOT EXISTS brand text,
ADD COLUMN IF NOT EXISTS model text,
ADD COLUMN IF NOT EXISTS fipe_price numeric,
ADD COLUMN IF NOT EXISTS current_km integer,
ADD COLUMN IF NOT EXISTS purchase_price numeric,
ADD COLUMN IF NOT EXISTS actual_sale_price numeric,
ADD COLUMN IF NOT EXISTS report_url text,
ADD COLUMN IF NOT EXISTS vehicle_images jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS stock_entry_date timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS sale_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS sold boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS manufacturing_year integer,
ADD COLUMN IF NOT EXISTS model_year integer,
ADD COLUMN IF NOT EXISTS plate text,
ADD COLUMN IF NOT EXISTS renavan text;

-- MUDAR PARA NULLABLE NA TABELA DE PRODUTOS
ALTER TABLE public.products ALTER COLUMN title DROP NOT NULL;
ALTER TABLE public.products ALTER COLUMN price DROP NOT NULL;

-- CRIAR AS COLUNAS DE CLIENTES SE FALTAR ALGUMA
ALTER TABLE IF EXISTS public.customers
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS cpf text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS document_urls text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS cnpj text,
ADD COLUMN IF NOT EXISTS document_type text DEFAULT 'CPF';

-- AJUSTAR VALIDAÇÕES DO CLIENTE (CPF / CNPJ)
ALTER TABLE public.customers ALTER COLUMN cpf DROP NOT NULL;
ALTER TABLE public.customers ALTER COLUMN address DROP NOT NULL; -- Para casos antigos
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_document_type_check') THEN
    ALTER TABLE public.customers DROP CONSTRAINT customers_document_type_check;
  END IF;
END $$;
ALTER TABLE public.customers ADD CONSTRAINT customers_document_type_check 
CHECK (
  (document_type = 'CPF' AND cpf IS NULL AND cnpj IS NULL) -- Allow empty just in case existing data lacks it
  OR (document_type = 'CPF' AND cpf IS NOT NULL AND cnpj IS NULL)
  OR (document_type = 'CNPJ' AND cnpj IS NOT NULL AND cpf IS NULL)
);

-- HABILITAR RLS NAS TABELAS PRINCIPAIS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_costs ENABLE ROW LEVEL SECURITY;

-- REFAZER POLÍTICAS PRINCIPAIS (Ignorando se já existem)
DO $$ 
BEGIN 
    BEGIN CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id); EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id); EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN CREATE POLICY "Users can view own products" ON public.products FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN CREATE POLICY "Users can insert own products" ON public.products FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN CREATE POLICY "Users can update own products" ON public.products FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN CREATE POLICY "Users can delete own products" ON public.products FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN CREATE POLICY "Users can view own customers" ON public.customers FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN CREATE POLICY "Users can insert own customers" ON public.customers FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN CREATE POLICY "Users can update own customers" ON public.customers FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN CREATE POLICY "Users can delete own customers" ON public.customers FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- CRIAR AS PASTAS DE ARQUIVOS (BUCKETS) NO SUPABASE DE DEPOIS DA MIGRAÇÃO
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('vehicle-invoices', 'vehicle-invoices', false, 5242880, ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('vehicle-reports', 'vehicle-reports', false, 5242880, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('vehicle-images', 'vehicle-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('customer-documents', 'customer-documents', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

-- POLÍTICAS DOS BUCKETS (Imagens de Veículos)
DO $$ 
BEGIN 
    BEGIN CREATE POLICY "Anyone can view vehicle images" ON storage.objects FOR SELECT USING (bucket_id = 'vehicle-images'); EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN CREATE POLICY "Users can upload their own vehicle images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'vehicle-images' AND auth.uid()::text = (storage.foldername(name))[1]); EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN CREATE POLICY "Users can update their own vehicle images" ON storage.objects FOR UPDATE USING (bucket_id = 'vehicle-images' AND auth.uid()::text = (storage.foldername(name))[1]); EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN CREATE POLICY "Users can delete their own vehicle images" ON storage.objects FOR DELETE USING (bucket_id = 'vehicle-images' AND auth.uid()::text = (storage.foldername(name))[1]); EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
