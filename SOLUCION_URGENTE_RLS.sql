-- ========================================
-- SOLUCIÓN URGENTE: DESHABILITAR RLS EN CUADRILLAS
-- ========================================
-- Este script desactiva RLS en la tabla cuadrillas para permitir
-- actualizaciones de ubicación sin restricciones.

-- PASO 1: Deshabilitar RLS completamente en la tabla cuadrillas
ALTER TABLE public.cuadrillas DISABLE ROW LEVEL SECURITY;

-- PASO 2: Verificar el estado actual
SELECT 
  schemaname,
  tablename,
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'cuadrillas';
-- Si rowsecurity = false, entonces RLS está deshabilitado ✅

-- PASO 3: Probar UPDATE manual (reemplaza 121 con tu ID de cuadrilla)
UPDATE public.cuadrillas 
SET 
  latitud = -12.061280,
  longitud = -77.074107
WHERE id = 121;

-- PASO 4: Verificar que se actualizó
SELECT id, nombre, latitud, longitud 
FROM public.cuadrillas 
WHERE id = 121;

-- ========================================
-- DESPUÉS DE EJECUTAR ESTE SCRIPT:
-- ========================================
-- 1. Ejecuta todo este script en el SQL Editor de Supabase
-- 2. Verifica que el UPDATE manual funciona
-- 3. Presiona "Iniciar seguimiento" en la app
-- 4. Los campos latitud y longitud deberían actualizarse automáticamente
-- ========================================
