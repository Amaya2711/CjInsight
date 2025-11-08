-- DESACTIVAR RLS EN TABLA CUADRILLAS
-- Ejecuta esto en Supabase SQL Editor

-- 1. Desactivar Row Level Security
ALTER TABLE public.cuadrillas DISABLE ROW LEVEL SECURITY;

-- 2. Eliminar todas las políticas existentes (por si acaso)
DROP POLICY IF EXISTS "Allow public read access to cuadrillas" ON public.cuadrillas;
DROP POLICY IF EXISTS "Allow authenticated users to update cuadrillas" ON public.cuadrillas;
DROP POLICY IF EXISTS "Allow all access to cuadrillas" ON public.cuadrillas;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.cuadrillas;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.cuadrillas;
DROP POLICY IF EXISTS "Allow update cuadrillas" ON public.cuadrillas;

-- 3. Verificar que RLS está desactivado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'cuadrillas';

-- Si ves rowsecurity = false, entonces RLS está DESACTIVADO (correcto)
-- Si ves rowsecurity = true, entonces RLS está ACTIVADO (mal)

-- 4. Verificar que no hay políticas activas
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'cuadrillas';

-- Si no hay resultados, entonces no hay políticas (correcto)
