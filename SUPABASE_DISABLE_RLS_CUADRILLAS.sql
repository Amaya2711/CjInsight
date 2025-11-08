-- DESHABILITAR COMPLETAMENTE RLS EN TABLA CUADRILLAS
-- ESTO PERMITIRÁ QUE LAS ACTUALIZACIONES DE UBICACIÓN FUNCIONEN

-- 1. Eliminar todas las políticas RLS existentes
DROP POLICY IF EXISTS "Cualquiera puede ver cuadrillas" ON public.cuadrillas;
DROP POLICY IF EXISTS "Cualquiera puede actualizar cuadrillas" ON public.cuadrillas;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver cuadrillas" ON public.cuadrillas;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar cuadrillas" ON public.cuadrillas;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.cuadrillas;
DROP POLICY IF EXISTS "Enable update for all users" ON public.cuadrillas;
DROP POLICY IF EXISTS "Permitir lectura a todos" ON public.cuadrillas;
DROP POLICY IF EXISTS "Permitir actualización a todos" ON public.cuadrillas;

-- 2. DESHABILITAR RLS COMPLETAMENTE
ALTER TABLE public.cuadrillas DISABLE ROW LEVEL SECURITY;

-- 3. Verificar que está deshabilitado
SELECT 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'cuadrillas';

-- RESULTADO ESPERADO:
-- tablename    | rowsecurity
-- cuadrillas   | false

-- 4. Probar un UPDATE directamente
UPDATE public.cuadrillas 
SET 
    latitud = -12.061280,
    longitud = -77.074107
WHERE id = 121;

-- 5. Verificar que se actualizó
SELECT 
    id, 
    nombre, 
    latitud, 
    longitud 
FROM public.cuadrillas 
WHERE id = 121;
