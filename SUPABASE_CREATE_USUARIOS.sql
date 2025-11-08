-- ===================================================
-- CREAR TABLA DE USUARIOS
-- Ejecuta este script en el SQL Editor de Supabase
-- ===================================================

-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS public.usuarios (
  id SERIAL PRIMARY KEY,
  nombre_usuario TEXT UNIQUE NOT NULL,
  clave_usuario TEXT NOT NULL,
  rol TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_usuarios_nombre_usuario ON public.usuarios(nombre_usuario);
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON public.usuarios(activo);

-- Habilitar RLS
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Política para testing (permite acceso a usuarios anónimos)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='usuarios' AND policyname='usuarios_all_anon') THEN
    CREATE POLICY "usuarios_all_anon" ON public.usuarios FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END$$;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_usuarios_updated_at ON public.usuarios;
CREATE TRIGGER update_usuarios_updated_at
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ===================================================
-- INSERTAR USUARIOS DE PRUEBA
-- ===================================================

-- Insertar usuario de prueba (si no existe)
INSERT INTO public.usuarios (nombre_usuario, clave_usuario, rol, activo)
VALUES 
  ('admin', 'admin123', 'administrador', true),
  ('tecnico1', 'tecnico123', 'tecnico', true),
  ('supervisor1', 'super123', 'supervisor', true)
ON CONFLICT (nombre_usuario) DO NOTHING;

-- ===================================================
-- VERIFICACIÓN
-- ===================================================

-- Ver usuarios creados
SELECT id, nombre_usuario, rol, activo, created_at FROM public.usuarios ORDER BY id;

-- ===================================================
-- CREDENCIALES DE PRUEBA
-- ===================================================

-- Usuario: admin
-- Contraseña: admin123
-- 
-- Usuario: tecnico1
-- Contraseña: tecnico123
-- 
-- Usuario: supervisor1
-- Contraseña: super123

-- ===================================================
-- IMPORTANTE: CAMBIAR CONTRASEÑAS EN PRODUCCIÓN
-- ===================================================
-- Estas contraseñas son solo para desarrollo/testing
-- En producción usa bcrypt u otro hash seguro
