-- Drop existing insert policy and recreate with all roles
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Create policy for all users including anonymous
CREATE POLICY "Anyone can create orders" 
ON public.orders 
FOR INSERT 
TO public
WITH CHECK (true);