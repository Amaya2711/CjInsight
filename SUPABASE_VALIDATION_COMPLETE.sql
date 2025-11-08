-- ============================================================================
-- SCRIPT DE VALIDACIÓN COMPLETA
-- ============================================================================
-- Este script verifica la estructura de las tablas y políticas RLS
-- ============================================================================

-- 1) Verificar estructura de tabla USUARIO
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'usuario'
ORDER BY ordinal_position;

-- 2) Verificar estructura de tabla CUADRILLAS
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'cuadrillas'
ORDER BY ordinal_position;

-- 3) Verificar RLS está activado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('usuario', 'cuadrillas');

-- 4) Verificar políticas RLS existentes
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
  AND tablename IN ('usuario', 'cuadrillas')
ORDER BY tablename, policyname;

-- 5) Listar usuarios de ejemplo (primeros 3)
SELECT 
  id_usuario,
  nombre_usuario,
  tipo_usuario,
  id as cuadrilla_id,
  activo
FROM public.usuario
LIMIT 3;

-- 6) Listar cuadrillas de ejemplo (primeras 3)
SELECT 
  id,
  nombre,
  zona,
  categoria,
  latitud,
  longitud
FROM public.cuadrillas
LIMIT 3;

-- 7) Verificar relación usuario-cuadrilla
SELECT 
  u.id_usuario,
  u.nombre_usuario,
  u.tipo_usuario,
  c.id as cuadrilla_id,
  c.nombre as cuadrilla_nombre,
  c.zona
FROM public.usuario u
LEFT JOIN public.cuadrillas c ON u.id = c.id
LIMIT 5;

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- Si alguna de estas queries falla, identifica qué está fallando:
-- 
-- Query 1 o 2 falla: La tabla no existe o no tiene los campos correctos
-- Query 3: RLS no está activado (rowsecurity debe ser TRUE)
-- Query 4: No hay políticas RLS configuradas
-- Query 5 o 6: Las tablas están vacías
-- Query 7: La relación usuario-cuadrilla no funciona (usuario.id != cuadrilla.id)
-- ============================================================================
