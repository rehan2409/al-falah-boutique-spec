-- Drop existing restrictive storage policies
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload payment QR" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update payment QR" ON storage.objects;

-- Create more permissive storage policies
CREATE POLICY "Anyone can upload product images" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Anyone can update product images" ON storage.objects 
FOR UPDATE USING (bucket_id = 'product-images');

CREATE POLICY "Anyone can delete product images" ON storage.objects 
FOR DELETE USING (bucket_id = 'product-images');

CREATE POLICY "Anyone can upload payment QR" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'payment-qr');

CREATE POLICY "Anyone can update payment QR" ON storage.objects 
FOR UPDATE USING (bucket_id = 'payment-qr');