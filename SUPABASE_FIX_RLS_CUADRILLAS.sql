-- Fix RLS policies for cuadrillas table to allow updates

-- Check current RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'cuadrillas';

-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'cuadrillas';

-- Option 1: Disable RLS (easier for development, but less secure)
-- ALTER TABLE public.cuadrillas DISABLE ROW LEVEL SECURITY;

-- Option 2: Create permissive policies (recommended)
-- First, enable RLS if not already enabled
ALTER TABLE public.cuadrillas ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all operations on cuadrillas" ON public.cuadrillas;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.cuadrillas;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.cuadrillas;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.cuadrillas;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.cuadrillas;

-- Create new permissive policies that allow all operations for authenticated users
CREATE POLICY "Allow select for authenticated users" ON public.cuadrillas
    FOR SELECT
    USING (true);

CREATE POLICY "Allow insert for authenticated users" ON public.cuadrillas
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" ON public.cuadrillas
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow delete for authenticated users" ON public.cuadrillas
    FOR DELETE
    USING (true);

-- Verify the record exists
SELECT id, nombre, latitud, longitud FROM public.cuadrillas WHERE id = 20;

-- Grant necessary permissions to authenticated role
GRANT ALL ON public.cuadrillas TO authenticated;
GRANT ALL ON public.cuadrillas TO anon;

-- Test update (this should work after applying the policies)
-- UPDATE public.cuadrillas SET latitud = -12.0, longitud = -77.0 WHERE id = 20;
