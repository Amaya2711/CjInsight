-- =====================================================
-- REFRESCAR CACHÉ DE ESQUEMA DE SUPABASE
-- =====================================================
-- Este script refresca el caché del API de PostgREST
-- para que vea las tablas recién creadas.
--
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- =====================================================

-- 1) Verificar que la tabla usuarios existe
SELECT 
  schemaname, 
  tablename, 
  tableowner 
FROM pg_tables 
WHERE tablename = 'usuarios';

-- 2) Verificar las columnas de usuarios
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'usuarios'
ORDER BY ordinal_position;

-- 3) Verificar permisos (RLS debe estar desactivado o con políticas correctas)
SELECT 
  relname, 
  relrowsecurity 
FROM pg_class 
WHERE relname = 'usuarios' 
  AND relnamespace = 'public'::regnamespace;

-- 4) Verificar que el role 'anon' tiene permisos
SELECT 
  grantee, 
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'usuarios';

-- 5) REFRESCAR EL CACHÉ DEL SCHEMA
-- Esto notifica a PostgREST que recargue el esquema
NOTIFY pgrst, 'reload schema';

-- 6) Verificar datos de ejemplo
SELECT 
  id, 
  nombre_usuario, 
  rol, 
  activo 
FROM usuarios 
LIMIT 5;

-- =====================================================
-- DESPUÉS DE EJECUTAR ESTE SCRIPT:
-- 
-- 1) Espera 10-20 segundos
-- 2) Intenta el login nuevamente desde la app
-- 3) Si sigue fallando, ejecuta también:
--    NOTIFY pgrst, 'reload config';
-- 4) Como último recurso, reinicia el proyecto 
--    desde el Dashboard de Supabase (Settings > General > Restart project)
-- =====================================================
