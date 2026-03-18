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