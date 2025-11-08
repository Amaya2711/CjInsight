-- ========================================
-- SOLUCIÓN DEFINITIVA - DESHABILITAR RLS
-- ========================================

-- 1. Verificar estado actual de RLS en tabla cuadrillas
SELECT 
  schemaname,
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'cuadrillas';

-- 2. DESHABILITAR RLS completamente en tabla cuadrillas
ALTER TABLE public.cuadrillas DISABLE ROW LEVEL SECURITY;

-- 3. Eliminar TODAS las políticas existentes (por si acaso)
DROP POLICY IF EXISTS "Enable all for service role" ON public.cuadrillas;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.cuadrillas;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.cuadrillas;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.cuadrillas;
DROP POLICY IF EXISTS "Allow anon read" ON public.cuadrillas;
DROP POLICY IF EXISTS "Allow anon update" ON public.cuadrillas;
DROP POLICY IF EXISTS "Allow all operations" ON public.cuadrillas;

-- 4. Verificar que RLS está deshabilitado
SELECT 
  schemaname,
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'cuadrillas';

-- 5. Probar UPDATE directo
UPDATE public.cuadrillas 
SET latitud = -12.046374, longitud = -77.042793 
WHERE id = 1;

-- 6. Verificar que se actualizó
SELECT id, nombre, latitud, longitud 
FROM public.cuadrillas 
WHERE id = 1;

-- ========================================
-- MENSAJE FINAL
-- ========================================
-- Si después de ejecutar este SQL el RLS sigue activo,
-- contacta al administrador de Supabase porque puede
-- haber una configuración a nivel de proyecto.
