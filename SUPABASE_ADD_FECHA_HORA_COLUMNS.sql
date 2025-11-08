-- ============================================================
-- AGREGAR COLUMNAS FECHA Y HORA A CUADRILLA_RUTA
-- ============================================================
-- Script para agregar columnas separadas de fecha y hora
-- en la zona horaria de Perú (America/Lima, UTC-5)
-- ============================================================

-- 1. Agregar columnas fecha y hora
ALTER TABLE public.cuadrilla_ruta
ADD COLUMN IF NOT EXISTS fecha DATE,
ADD COLUMN IF NOT EXISTS hora TIME;

-- 2. Crear función para actualizar fecha y hora desde timestamp
-- Convierte timestamp UTC a zona horaria de Perú (UTC-5)
CREATE OR REPLACE FUNCTION public.update_fecha_hora_from_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Convertir timestamp a zona horaria de Perú (UTC-5) y extraer fecha y hora
  NEW.fecha := (NEW.timestamp AT TIME ZONE 'America/Lima')::DATE;
  NEW.hora := (NEW.timestamp AT TIME ZONE 'America/Lima')::TIME;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Crear trigger para actualizar automáticamente fecha y hora
DROP TRIGGER IF EXISTS trigger_update_fecha_hora ON public.cuadrilla_ruta;
CREATE TRIGGER trigger_update_fecha_hora
BEFORE INSERT OR UPDATE OF timestamp ON public.cuadrilla_ruta
FOR EACH ROW
EXECUTE FUNCTION public.update_fecha_hora_from_timestamp();

-- 4. Actualizar registros existentes con fecha y hora
UPDATE public.cuadrilla_ruta
SET 
  fecha = (timestamp AT TIME ZONE 'America/Lima')::DATE,
  hora = (timestamp AT TIME ZONE 'America/Lima')::TIME
WHERE fecha IS NULL OR hora IS NULL;

-- 5. Crear índice en fecha para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_cuadrilla_ruta_fecha ON public.cuadrilla_ruta(fecha DESC);

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

-- Ver últimas 10 rutas con fecha y hora
SELECT 
  cr.id,
  cr.cuadrilla_id,
  c.nombre as cuadrilla_nombre,
  cr.fecha,
  cr.hora,
  cr.timestamp,
  cr.latitud,
  cr.longitud,
  cr.created_at,
  cr.updated_at
FROM public.cuadrilla_ruta cr
LEFT JOIN public.cuadrillas c ON c.id = cr.cuadrilla_id
ORDER BY cr.created_at DESC
LIMIT 10;

-- Verificar que las columnas existen
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'cuadrilla_ruta'
  AND column_name IN ('fecha', 'hora', 'timestamp');

-- ============================================================
-- INSTRUCCIONES DE USO
-- ============================================================
-- 
-- 1. Copia y ejecuta este script completo en Supabase SQL Editor
-- 2. El trigger se activará automáticamente para nuevos registros
-- 3. Los registros existentes se actualizarán con la zona horaria de Perú
-- 4. Las columnas fecha y hora se calcularán automáticamente desde timestamp
-- 
-- ============================================================
