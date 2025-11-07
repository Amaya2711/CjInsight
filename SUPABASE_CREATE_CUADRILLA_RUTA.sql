-- ============================================================
-- CREAR TABLA CUADRILLA_RUTA PARA SEGUIMIENTO DE RUTAS
-- ============================================================
-- Esta tabla almacena el historial de todas las ubicaciones
-- registradas por cada cuadrilla (tracking de rutas)
-- ============================================================

-- 1. Crear la tabla cuadrilla_ruta
CREATE TABLE IF NOT EXISTS public.cuadrilla_ruta (
  id BIGSERIAL PRIMARY KEY,
  cuadrilla_id INTEGER NOT NULL REFERENCES public.cuadrillas(id) ON DELETE CASCADE,
  latitud DECIMAL(10, 8) NOT NULL,
  longitud DECIMAL(11, 8) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accuracy REAL,
  altitude REAL,
  heading REAL,
  speed REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_cuadrilla_ruta_cuadrilla_id ON public.cuadrilla_ruta(cuadrilla_id);
CREATE INDEX IF NOT EXISTS idx_cuadrilla_ruta_timestamp ON public.cuadrilla_ruta(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cuadrilla_ruta_cuadrilla_timestamp ON public.cuadrilla_ruta(cuadrilla_id, timestamp DESC);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.cuadrilla_ruta ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas de RLS (permitir todo por ahora)
DROP POLICY IF EXISTS "Allow all operations on cuadrilla_ruta" ON public.cuadrilla_ruta;
CREATE POLICY "Allow all operations on cuadrilla_ruta"
ON public.cuadrilla_ruta
FOR ALL
USING (true)
WITH CHECK (true);

-- 5. Crear función trigger para insertar automáticamente en cuadrilla_ruta
CREATE OR REPLACE FUNCTION public.track_cuadrilla_ubicacion()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo insertar si latitud Y longitud fueron actualizadas y no son NULL
  IF (NEW.latitud IS NOT NULL AND NEW.longitud IS NOT NULL) AND
     (OLD.latitud IS DISTINCT FROM NEW.latitud OR OLD.longitud IS DISTINCT FROM NEW.longitud) THEN
    
    INSERT INTO public.cuadrilla_ruta (cuadrilla_id, latitud, longitud)
    VALUES (NEW.id, NEW.latitud, NEW.longitud);
    
    RAISE NOTICE '✅ Ruta registrada: Cuadrilla % -> (%, %)', NEW.id, NEW.latitud, NEW.longitud;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Crear trigger en la tabla cuadrillas
DROP TRIGGER IF EXISTS trigger_track_cuadrilla_ubicacion ON public.cuadrillas;
CREATE TRIGGER trigger_track_cuadrilla_ubicacion
AFTER UPDATE OF latitud, longitud ON public.cuadrillas
FOR EACH ROW
EXECUTE FUNCTION public.track_cuadrilla_ubicacion();

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
-- Verificar que la tabla existe
SELECT 
  tablename, 
  schemaname,
  hasindexes,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'cuadrilla_ruta';

-- Verificar que el trigger está activo
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  tgtype as trigger_type
FROM pg_trigger 
WHERE tgname = 'trigger_track_cuadrilla_ubicacion';

-- Contar registros existentes
SELECT COUNT(*) as total_rutas FROM public.cuadrilla_ruta;

-- Ver últimas 10 rutas registradas
SELECT 
  cr.id,
  cr.cuadrilla_id,
  c.nombre as cuadrilla_nombre,
  cr.latitud,
  cr.longitud,
  cr.timestamp,
  cr.created_at
FROM public.cuadrilla_ruta cr
LEFT JOIN public.cuadrillas c ON c.id = cr.cuadrilla_id
ORDER BY cr.created_at DESC
LIMIT 10;

-- ============================================================
-- INSTRUCCIONES DE USO
-- ============================================================
-- 
-- 1. Copia y ejecuta este script completo en Supabase SQL Editor
-- 2. El trigger se activará automáticamente cada vez que se actualice
--    la latitud o longitud de una cuadrilla
-- 3. Para probar manualmente:
--    UPDATE public.cuadrillas 
--    SET latitud = -12.0464, longitud = -77.0428 
--    WHERE id = 1;
-- 4. Para ver el historial de rutas de una cuadrilla específica:
--    SELECT * FROM public.cuadrilla_ruta 
--    WHERE cuadrilla_id = 1 
--    ORDER BY timestamp DESC;
-- 
-- ============================================================
