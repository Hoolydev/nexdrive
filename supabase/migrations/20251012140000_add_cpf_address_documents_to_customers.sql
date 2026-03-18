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