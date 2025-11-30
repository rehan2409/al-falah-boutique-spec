-- Create storage buckets for product images and payment QR
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true);

INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-qr', 'payment-qr', true);

-- Storage policies for product images
CREATE POLICY "Anyone can view product images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update product images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete product images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Storage policies for payment QR
CREATE POLICY "Anyone can view payment QR" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'payment-qr');

CREATE POLICY "Authenticated users can upload payment QR" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'payment-qr' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update payment QR" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'payment-qr' AND auth.role() = 'authenticated');

-- Create coupons table
CREATE TABLE public.coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  min_purchase numeric DEFAULT 0,
  max_uses integer DEFAULT NULL,
  used_count integer DEFAULT 0,
  active boolean DEFAULT true,
  expires_at timestamp with time zone DEFAULT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS for coupons
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active coupons" 
ON public.coupons FOR SELECT 
USING (active = true);

CREATE POLICY "Authenticated users can insert coupons" 
ON public.coupons FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update coupons" 
ON public.coupons FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete coupons" 
ON public.coupons FOR DELETE 
USING (auth.role() = 'authenticated');

-- Create settings table for payment QR and other configs
CREATE TABLE public.settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS for settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings" 
ON public.settings FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert settings" 
ON public.settings FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update settings" 
ON public.settings FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Trigger for updated_at on coupons
CREATE TRIGGER update_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on settings
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();