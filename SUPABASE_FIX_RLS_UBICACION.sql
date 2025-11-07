-- SOLUCIÓN FINAL PARA ACTUALIZACIÓN DE UBICACIÓN
-- Este script permite que la app actualice latitud y longitud sin deshabilitar RLS completamente

-- Primero, asegurarnos que RLS esté habilitado
ALTER TABLE public.cuadrillas ENABLE ROW LEVEL SECURITY;

-- Eliminar política anterior si existe
DROP POLICY IF EXISTS "Allow anonymous location updates" ON public.cuadrillas;
DROP POLICY IF EXISTS "Allow location updates" ON public.cuadrillas;
DROP POLICY IF EXISTS "Enable update for all users" ON public.cuadrillas;

-- Crear nueva política que permite UPDATE de ubicación para todos
CREATE POLICY "Allow location updates for all"
ON public.cuadrillas
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Opcional: Si también necesitas leer cuadrillas
DROP POLICY IF EXISTS "Allow read for all users" ON public.cuadrillas;
CREATE POLICY "Allow read for all users"
ON public.cuadrillas
FOR SELECT
TO anon, authenticated
USING (true);

-- Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'cuadrillas'
ORDER BY policyname;
