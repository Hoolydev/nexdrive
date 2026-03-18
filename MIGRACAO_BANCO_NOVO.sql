-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own products"
  ON public.products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own products"
  ON public.products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products"
  ON public.products FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own products"
  ON public.products FOR DELETE
  USING (auth.uid() = user_id);

-- Create customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own customers"
  ON public.customers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customers"
  ON public.customers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customers"
  ON public.customers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own customers"
  ON public.customers FOR DELETE
  USING (auth.uid() = user_id);

-- Create messages table for history
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  recipient_count INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;

-- Trigger to call the function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
-- Fix function search path for handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;
-- Fix function search path for update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
-- Add vehicle-specific columns to products table
ALTER TABLE public.products
ADD COLUMN brand text,
ADD COLUMN model text,
ADD COLUMN fipe_price numeric,
ADD COLUMN current_km integer,
ADD COLUMN purchase_price numeric,
ADD COLUMN actual_sale_price numeric,
ADD COLUMN report_url text,
ADD COLUMN vehicle_images jsonb DEFAULT '[]'::jsonb,
ADD COLUMN stock_entry_date timestamp with time zone DEFAULT now(),
ADD COLUMN sale_date timestamp with time zone,
ADD COLUMN sold boolean DEFAULT false;

-- Update existing columns to be nullable for migration
ALTER TABLE public.products
ALTER COLUMN title DROP NOT NULL,
ALTER COLUMN price DROP NOT NULL;

-- Create storage bucket for vehicle reports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle-reports',
  'vehicle-reports',
  false,
  5242880,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
);

-- Create storage bucket for vehicle images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle-images',
  'vehicle-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- RLS policies for vehicle-reports bucket
CREATE POLICY "Users can view their own vehicle reports"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'vehicle-reports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own vehicle reports"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'vehicle-reports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own vehicle reports"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'vehicle-reports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own vehicle reports"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'vehicle-reports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policies for vehicle-images bucket
CREATE POLICY "Anyone can view vehicle images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'vehicle-images');

CREATE POLICY "Users can upload their own vehicle images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'vehicle-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own vehicle images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'vehicle-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own vehicle images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'vehicle-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
-- Add manufacturing and model year to products
ALTER TABLE public.products 
ADD COLUMN manufacturing_year INTEGER,
ADD COLUMN model_year INTEGER;

-- Create vehicle_costs table
CREATE TABLE public.vehicle_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  invoice_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicle_costs ENABLE ROW LEVEL SECURITY;

-- Create policies for vehicle_costs
CREATE POLICY "Users can view own vehicle costs" 
ON public.vehicle_costs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vehicle costs" 
ON public.vehicle_costs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vehicle costs" 
ON public.vehicle_costs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vehicle costs" 
ON public.vehicle_costs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create storage bucket for invoices
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle-invoices',
  'vehicle-invoices',
  false,
  5242880,
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for invoices
CREATE POLICY "Users can view own invoices"
ON storage.objects FOR SELECT
USING (bucket_id = 'vehicle-invoices' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own invoices"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'vehicle-invoices' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own invoices"
ON storage.objects FOR UPDATE
USING (bucket_id = 'vehicle-invoices' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own invoices"
ON storage.objects FOR DELETE
USING (bucket_id = 'vehicle-invoices' AND auth.uid()::text = (storage.foldername(name))[1]);
-- Add plate and renavan fields to products table
ALTER TABLE public.products 
ADD COLUMN plate TEXT,
ADD COLUMN renavan TEXT;
-- Add CPF, address and document URLs to customers
ALTER TABLE public.customers 
ADD COLUMN cpf TEXT NOT NULL,
ADD COLUMN address TEXT NOT NULL,
ADD COLUMN document_urls TEXT[] DEFAULT '{}'::text[];

-- Create storage bucket for customer documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'customer-documents',
  'customer-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for customer documents
CREATE POLICY "Users can view own customer documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'customer-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own customer documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'customer-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own customer documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'customer-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own customer documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'customer-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
-- Add support for CNPJ and document type on customers
-- 1) Make cpf nullable
-- 2) Add cnpj
-- 3) Add document_type (ENUM-like via CHECK) and constraint enforcing cpf/cnpj based on type

BEGIN;

-- Make cpf nullable
ALTER TABLE public.customers
  ALTER COLUMN cpf DROP NOT NULL;

-- Add cnpj column
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS cnpj TEXT;

-- Add document_type column with default 'CPF'
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS document_type TEXT NOT NULL DEFAULT 'CPF';

-- Drop existing constraint if re-running (idempotency)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'customers_document_type_check'
  ) THEN
    ALTER TABLE public.customers DROP CONSTRAINT customers_document_type_check;
  END IF;
END$$;

-- Enforce that when document_type = 'CPF' then cpf is set and cnpj is null,
-- and when document_type = 'CNPJ' then cnpj is set and cpf is null.
ALTER TABLE public.customers
  ADD CONSTRAINT customers_document_type_check
  CHECK (
    (document_type = 'CPF' AND cpf IS NOT NULL AND cnpj IS NULL)
    OR
    (document_type = 'CNPJ' AND cnpj IS NOT NULL AND cpf IS NULL)
  );

COMMIT;
