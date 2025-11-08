-- ============================================
-- SOLUCIÓN SIMPLE: Permitir actualización de ubicación sin auth.uid()
-- ============================================
-- Como el sistema NO usa Supabase Auth (auth.uid() es null),
-- necesitamos una política que permita actualizaciones sin depender de auth.uid()

-- OPCIÓN 1: Deshabilitar RLS en cuadrillas (MÁS SIMPLE - RECOMENDADO PARA ESTE CASO)
-- Esta opción permite que cualquier usuario con la anon key pueda leer y actualizar la tabla
ALTER TABLE public.cuadrillas DISABLE ROW LEVEL SECURITY;

-- OPCIÓN 2: Crear política permisiva (si prefieres mantener RLS habilitado)
-- Esta opción permite solo a usuarios con rol 'anon' o 'authenticated' actualizar

-- Si prefieres la Opción 2, comenta la línea anterior y descomenta las siguientes:

-- -- Primero, habilita RLS si lo deshabilitaste antes
-- ALTER TABLE public.cuadrillas ENABLE ROW LEVEL SECURITY;
-- 
-- -- Eliminar políticas existentes que no funcionan
-- DROP POLICY IF EXISTS "cuadrillas_read_my_team" ON public.cuadrillas;
-- DROP POLICY IF EXISTS "cuadrillas_update_location" ON public.cuadrillas;
-- 
-- -- Crear política permisiva para SELECT (lectura)
-- CREATE POLICY "cuadrillas_select_all"
-- ON public.cuadrillas
-- FOR SELECT
-- TO anon, authenticated
-- USING (true);
-- 
-- -- Crear política permisiva para UPDATE (actualización)
-- CREATE POLICY "cuadrillas_update_all"
-- ON public.cuadrillas
-- FOR UPDATE
-- TO anon, authenticated
-- USING (true)
-- WITH CHECK (true);

-- Verificar el estado de RLS
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'cuadrillas';

-- Verificar las políticas activas (si RLS está habilitado)
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd
FROM pg_policies
WHERE tablename = 'cuadrillas'
ORDER BY policyname;
