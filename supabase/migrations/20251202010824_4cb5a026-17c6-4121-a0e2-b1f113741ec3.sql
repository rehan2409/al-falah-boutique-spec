-- Drop existing restrictive policies for coupons
DROP POLICY IF EXISTS "Authenticated users can insert coupons" ON public.coupons;
DROP POLICY IF EXISTS "Authenticated users can update coupons" ON public.coupons;
DROP POLICY IF EXISTS "Authenticated users can delete coupons" ON public.coupons;

-- Drop existing restrictive policies for settings
DROP POLICY IF EXISTS "Authenticated users can insert settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated users can update settings" ON public.settings;

-- Create more permissive policies for admin operations
CREATE POLICY "Allow all to insert coupons" ON public.coupons FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all to update coupons" ON public.coupons FOR UPDATE USING (true);
CREATE POLICY "Allow all to delete coupons" ON public.coupons FOR DELETE USING (true);

CREATE POLICY "Allow all to insert settings" ON public.settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all to update settings" ON public.settings FOR UPDATE USING (true);