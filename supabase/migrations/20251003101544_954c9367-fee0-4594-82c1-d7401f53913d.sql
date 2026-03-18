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