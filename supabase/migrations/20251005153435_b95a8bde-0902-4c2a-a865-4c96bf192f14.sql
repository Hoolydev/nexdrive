-- Add plate and renavan fields to products table
ALTER TABLE public.products 
ADD COLUMN plate TEXT,
ADD COLUMN renavan TEXT;