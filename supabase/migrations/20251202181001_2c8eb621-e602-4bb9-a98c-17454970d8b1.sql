-- Completely disable RLS on orders table
-- This allows anyone to insert orders without authentication
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;

-- Drop all policies since RLS is disabled
DROP POLICY IF EXISTS "public_insert_orders" ON public.orders;
DROP POLICY IF EXISTS "admin_select_orders" ON public.orders;
DROP POLICY IF EXISTS "admin_update_orders" ON public.orders;