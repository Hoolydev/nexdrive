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