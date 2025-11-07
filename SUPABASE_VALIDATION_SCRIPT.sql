-- =====================================================
-- SCRIPT DE VALIDACIÓN Y CORRECCIÓN DE SUPABASE
-- =====================================================
-- Ejecuta este script en Supabase SQL Editor para validar
-- y corregir la configuración de tu base de datos

-- 1. VERIFICAR ESTRUCTURA DE TABLAS
-- =====================================================
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN ('usuario', 'cuadrillas', 'sites_v1', 'tickets_v1')
ORDER BY table_name, ordinal_position;

-- 2. VERIFICAR QUE LA TABLA USUARIO TENGA LOS CAMPOS CORRECTOS
-- =====================================================
-- La tabla USUARIO debe tener estos campos:
-- - id_usuario (integer, primary key)
-- - nombre_usuario (text)
-- - clave_usuario (text)
-- - activo (boolean)

-- 3. VERIFICAR QUE LA TABLA CUADRILLAS TENGA LOS CAMPOS CORRECTOS
-- =====================================================
-- La tabla CUADRILLAS debe tener estos campos:
-- - id (integer, primary key)
-- - nombre (text)
-- - latitud (numeric o double precision)
-- - longitud (numeric o double precision)
-- - usuario_id (integer, foreign key a usuario.id_usuario)

-- 4. VERIFICAR POLÍTICAS DE RLS (Row Level Security)
-- =====================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('usuario', 'cuadrillas', 'sites_v1', 'tickets_v1')
ORDER BY tablename, policyname;

-- 5. VERIFICAR QUE RLS ESTÉ HABILITADO
-- =====================================================
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('usuario', 'cuadrillas', 'sites_v1', 'tickets_v1');

-- 6. CONTAR REGISTROS EN CADA TABLA
-- =====================================================
SELECT 'usuario' as tabla, COUNT(*) as registros FROM usuario
UNION ALL
SELECT 'cuadrillas', COUNT(*) FROM cuadrillas
UNION ALL
SELECT 'sites_v1', COUNT(*) FROM sites_v1
UNION ALL
SELECT 'tickets_v1', COUNT(*) FROM tickets_v1;

-- 7. VERIFICAR RELACIÓN USUARIO <-> CUADRILLAS
-- =====================================================
-- Verificar que existe la foreign key
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'cuadrillas';

-- 8. VERIFICAR DATOS DE USUARIO
-- =====================================================
SELECT 
    id_usuario,
    nombre_usuario,
    activo,
    LENGTH(clave_usuario) as longitud_clave
FROM usuario
LIMIT 10;

-- 9. VERIFICAR DATOS DE CUADRILLAS
-- =====================================================
SELECT 
    id,
    nombre,
    latitud,
    longitud,
    usuario_id
FROM cuadrillas
LIMIT 10;

-- 10. RECARGAR SCHEMA (SI ES NECESARIO)
-- =====================================================
-- Descomenta la siguiente línea si necesitas recargar el schema
-- NOTIFY pgrst, 'reload schema';

-- =====================================================
-- SCRIPTS DE CORRECCIÓN (SI ES NECESARIO)
-- =====================================================

-- Si la tabla USUARIO no tiene RLS habilitado:
-- ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;

-- Si la tabla USUARIO no tiene política de lectura:
-- DROP POLICY IF EXISTS "Allow anonymous read" ON public.usuario;
-- CREATE POLICY "Allow anonymous read" ON public.usuario FOR SELECT USING (true);

-- Si la tabla CUADRILLAS no tiene RLS habilitado:
-- ALTER TABLE public.cuadrillas ENABLE ROW LEVEL SECURITY;

-- Si la tabla CUADRILLAS no tiene política de lectura:
-- DROP POLICY IF EXISTS "Allow anonymous read" ON public.cuadrillas;
-- CREATE POLICY "Allow anonymous read" ON public.cuadrillas FOR SELECT USING (true);

-- Si la tabla CUADRILLAS no tiene política de actualización:
-- DROP POLICY IF EXISTS "Allow anonymous update" ON public.cuadrillas;
-- CREATE POLICY "Allow anonymous update" ON public.cuadrillas FOR UPDATE USING (true);

-- Si necesitas crear la columna usuario_id en cuadrillas:
-- ALTER TABLE public.cuadrillas ADD COLUMN IF NOT EXISTS usuario_id INTEGER;
-- ALTER TABLE public.cuadrillas ADD CONSTRAINT cuadrillas_usuario_id_fkey 
--   FOREIGN KEY (usuario_id) REFERENCES public.usuario(id_usuario);

-- Si necesitas actualizar la relación entre USUARIO y CUADRILLAS:
-- UPDATE cuadrillas SET usuario_id = (
--   SELECT id_usuario FROM usuario WHERE nombre_usuario = 'CQ_AL'
-- ) WHERE id = 120;

-- =====================================================
-- DESPUÉS DE EJECUTAR LOS SCRIPTS DE CORRECCIÓN
-- =====================================================
-- 1. Ejecuta: NOTIFY pgrst, 'reload schema';
-- 2. Espera 10-20 segundos
-- 3. Prueba la conexión desde la app usando el botón "Diagnóstico"
