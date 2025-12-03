-- Add payment_screenshot column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_screenshot text;

-- Create storage bucket for payment screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-screenshots', 'payment-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload payment screenshots
CREATE POLICY "Authenticated users can upload payment screenshots"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-screenshots');

-- Allow anyone to view payment screenshots
CREATE POLICY "Anyone can view payment screenshots"
ON storage.objects
FOR SELECT
USING (bucket_id = 'payment-screenshots');