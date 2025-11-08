-- ===================================================
-- AGREGAR COLUMNA cuadrilla_id A TABLA usuarios
-- Ejecuta este script en el SQL Editor de Supabase
-- ===================================================

-- Agregar columna cuadrilla_id a la tabla usuarios
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS cuadrilla_id INTEGER;

-- Crear índice para búsquedas más rápidas
CREATE INDEX IF NOT EXISTS idx_usuarios_cuadrilla_id ON public.usuarios(cuadrilla_id);

-- Agregar foreign key constraint (opcional, si quieres validar que el cuadrilla_id existe)
-- Solo descomenta si tienes una tabla de cuadrillas
-- ALTER TABLE public.usuarios 
-- ADD CONSTRAINT fk_usuarios_cuadrilla 
-- FOREIGN KEY (cuadrilla_id) 
-- REFERENCES public.cuadrillas(cuadrilla_id)
-- ON DELETE SET NULL;

-- ===================================================
-- ACTUALIZAR USUARIOS DE PRUEBA CON cuadrilla_id
-- ===================================================

-- Actualizar usuario admin con cuadrilla_id de ejemplo
UPDATE public.usuarios 
SET cuadrilla_id = 120 
WHERE nombre_usuario = 'admin';

-- Actualizar otros usuarios si es necesario
-- UPDATE public.usuarios SET cuadrilla_id = 121 WHERE nombre_usuario = 'tecnico1';
-- UPDATE public.usuarios SET cuadrilla_id = 122 WHERE nombre_usuario = 'supervisor1';

-- ===================================================
-- VERIFICACIÓN
-- ===================================================

-- Ver usuarios con sus cuadrilla_id
SELECT id, nombre_usuario, rol, cuadrilla_id, activo FROM public.usuarios ORDER BY id;

-- Refrescar el esquema para que el API de Supabase detecte los cambios
NOTIFY pgrst, 'reload schema';
