-- =====================================================
-- CREAR/ACTUALIZAR TABLA USUARIO (SINGULAR)
-- =====================================================
-- Este script crea la tabla usuario y la configura
-- correctamente para el sistema de autenticación.
--
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- =====================================================

-- 1) Verificar si existe tabla usuarios (plural) antigua
SELECT schemaname, tablename FROM pg_tables WHERE tablename LIKE '%usuario%';

-- 2) Eliminar tabla usuarios si existe (SOLO si quieres migrar)
-- DROP TABLE IF EXISTS public.usuarios CASCADE;

-- 3) Crear tabla usuario (SINGULAR)
CREATE TABLE IF NOT EXISTS public.usuario (
  id TEXT PRIMARY KEY,  -- Código ID del usuario (ej: CQ_AL)
  nombre_usuario TEXT UNIQUE NOT NULL,
  clave_usuario TEXT NOT NULL,
  rol TEXT,
  cuadrilla_id INTEGER,  -- ID de la cuadrilla asociada (ej: 120)
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4) Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_usuario_nombre_usuario ON public.usuario(nombre_usuario);
CREATE INDEX IF NOT EXISTS idx_usuario_cuadrilla_id ON public.usuario(cuadrilla_id);
CREATE INDEX IF NOT EXISTS idx_usuario_activo ON public.usuario(activo);

-- 5) Comentarios de documentación
COMMENT ON TABLE public.usuario IS 'Tabla de usuarios del sistema';
COMMENT ON COLUMN public.usuario.id IS 'Código ID del usuario (ej: CQ_AL)';
COMMENT ON COLUMN public.usuario.cuadrilla_id IS 'ID de la cuadrilla asociada al usuario';

-- 6) Habilitar RLS (Row Level Security)
ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;

-- 7) Crear política para permitir acceso anónimo (para testing/login)
DROP POLICY IF EXISTS "usuario_all_anon" ON public.usuario;
CREATE POLICY "usuario_all_anon" 
  ON public.usuario 
  FOR ALL 
  TO anon 
  USING (true) 
  WITH CHECK (true);

-- 8) Dar permisos explícitos al rol anon
GRANT SELECT, INSERT, UPDATE ON public.usuario TO anon;
GRANT SELECT, INSERT, UPDATE ON public.usuario TO authenticated;

-- 9) Trigger para actualizar updated_at automáticamente
-- Primero crear la función si no existe
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar el trigger
DROP TRIGGER IF EXISTS update_usuario_updated_at ON public.usuario;
CREATE TRIGGER update_usuario_updated_at
  BEFORE UPDATE ON public.usuario
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- INSERTAR USUARIOS DE PRUEBA
-- =====================================================

-- Insertar usuarios de ejemplo
INSERT INTO public.usuario (id, nombre_usuario, clave_usuario, rol, cuadrilla_id, activo)
VALUES 
  ('CQ_AL', 'admin', 'admin123', 'administrador', NULL, true),
  ('CQ_120', 'cuadrilla120', 'clave123', 'campo', 120, true),
  ('CQ_121', 'cuadrilla121', 'clave123', 'campo', 121, true),
  ('SUP_01', 'supervisor1', 'super123', 'supervisor', NULL, true)
ON CONFLICT (id) DO UPDATE SET
  nombre_usuario = EXCLUDED.nombre_usuario,
  clave_usuario = EXCLUDED.clave_usuario,
  rol = EXCLUDED.rol,
  cuadrilla_id = EXCLUDED.cuadrilla_id,
  activo = EXCLUDED.activo;

-- =====================================================
-- REFRESCAR CACHÉ DEL API
-- =====================================================

-- Notificar a PostgREST que recargue el esquema
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Ver estructura de la tabla
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'usuario'
ORDER BY ordinal_position;

-- Ver usuarios creados
SELECT 
  id, 
  nombre_usuario, 
  rol, 
  cuadrilla_id,
  activo, 
  created_at 
FROM public.usuario 
ORDER BY id;

-- Verificar políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'usuario';

-- Verificar permisos
SELECT 
  grantee, 
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'usuario';

-- =====================================================
-- CREDENCIALES DE PRUEBA
-- =====================================================
-- Usuario: admin
-- Contraseña: admin123
-- ID: CQ_AL
-- 
-- Usuario: cuadrilla120
-- Contraseña: clave123
-- ID: CQ_120
-- Cuadrilla: 120
-- 
-- Usuario: cuadrilla121
-- Contraseña: clave123
-- ID: CQ_121
-- Cuadrilla: 121
-- 
-- Usuario: supervisor1
-- Contraseña: super123
-- ID: SUP_01
-- =====================================================

-- =====================================================
-- INSTRUCCIONES POSTERIORES
-- =====================================================
-- 1. Ejecuta este script completo en Supabase SQL Editor
-- 2. Espera 10-20 segundos para que se actualice el caché
-- 3. Intenta hacer login desde la app
-- 4. Si sigue fallando, ve a Project Settings > API
--    y verifica que "usuario" aparece en la lista de tablas
-- 5. Como último recurso, reinicia el proyecto desde
--    Settings > General > Restart project (tarda 2-3 min)
-- =====================================================
