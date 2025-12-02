-- Disable RLS on orders table for public insert access
-- Keep existing policies for admin read/update but allow public inserts
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with force for specific operations
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies and recreate properly
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "orders_admin_view" ON public.orders;
DROP POLICY IF EXISTS "orders_admin_update" ON public.orders;

-- Allow anyone to insert orders (no authentication required)
CREATE POLICY "public_insert_orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (true);

-- Admin can view all orders
CREATE POLICY "admin_select_orders" 
ON public.orders 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update orders
CREATE POLICY "admin_update_orders" 
ON public.orders 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));