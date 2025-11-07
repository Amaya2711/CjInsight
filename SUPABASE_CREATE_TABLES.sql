-- ===================================================
-- SUPABASE TABLE CREATION SCRIPT
-- Creates all required tables with proper structure
-- Run this FIRST before the migration script
-- ===================================================

-- ===================================================
-- PASO 1: Crear tablas de catálogos
-- ===================================================

CREATE TABLE IF NOT EXISTS public.catalogo_descripcion (
  id SERIAL PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  descripcion TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.catalogo_tipo_falla (
  id SERIAL PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  tipo_falla TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================================
-- PASO 2: Crear tabla de sites
-- ===================================================

CREATE TABLE IF NOT EXISTS public.sites (
  id SERIAL PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  tipologia TEXT,
  region TEXT NOT NULL,
  zona TEXT NOT NULL,
  departamento TEXT,
  provincia TEXT,
  distrito TEXT,
  direccion TEXT,
  latitud DOUBLE PRECISION NOT NULL,
  longitud DOUBLE PRECISION NOT NULL,
  es_principal BOOLEAN DEFAULT false,
  site_padre_id INTEGER REFERENCES public.sites(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sites_codigo ON public.sites(codigo);
CREATE INDEX IF NOT EXISTS idx_sites_region ON public.sites(region);
CREATE INDEX IF NOT EXISTS idx_sites_zona ON public.sites(zona);

-- ===================================================
-- PASO 3: Crear tabla de cuadrillas
-- ===================================================

CREATE TABLE IF NOT EXISTS public.cuadrillas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT,
  zona TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'disponible',
  tipo TEXT,
  latitud_actual DOUBLE PRECISION,
  longitud_actual DOUBLE PRECISION,
  ultima_ubicacion_at TIMESTAMPTZ,
  departamento TEXT,
  base TEXT,
  es_interzonal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cuadrillas_zona ON public.cuadrillas(zona);
CREATE INDEX IF NOT EXISTS idx_cuadrillas_estado ON public.cuadrillas(estado);

-- ===================================================
-- PASO 4: Crear tabla de técnicos
-- ===================================================

CREATE TABLE IF NOT EXISTS public.tecnicos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  rol TEXT NOT NULL DEFAULT 'tecnico',
  tipo_usuario TEXT NOT NULL DEFAULT 'campo',
  zona TEXT,
  estado TEXT NOT NULL DEFAULT 'activo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tecnicos_zona ON public.tecnicos(zona);
CREATE INDEX IF NOT EXISTS idx_tecnicos_estado ON public.tecnicos(estado);

-- ===================================================
-- PASO 5: Crear tabla de relación cuadrilla-técnico
-- ===================================================

CREATE TABLE IF NOT EXISTS public.cuadrilla_tecnico (
  cuadrilla_id TEXT NOT NULL REFERENCES public.cuadrillas(id) ON DELETE CASCADE,
  tecnico_id TEXT NOT NULL REFERENCES public.tecnicos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (cuadrilla_id, tecnico_id)
);

CREATE INDEX IF NOT EXISTS idx_cuadrilla_tecnico_cuadrilla ON public.cuadrilla_tecnico(cuadrilla_id);
CREATE INDEX IF NOT EXISTS idx_cuadrilla_tecnico_tecnico ON public.cuadrilla_tecnico(tecnico_id);

-- ===================================================
-- PASO 6: Crear tabla de tickets
-- ===================================================

CREATE TABLE IF NOT EXISTS public.tickets (
  id SERIAL PRIMARY KEY,
  folio TEXT UNIQUE,
  site_id INTEGER NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  codigo_site TEXT,
  descripcion TEXT NOT NULL,
  tipo_falla TEXT NOT NULL,
  detalle TEXT,
  severidad TEXT NOT NULL CHECK (severidad IN ('BAJA', 'MEDIA', 'MEDIA-ALTA', 'ALTA')),
  estado TEXT NOT NULL CHECK (estado IN ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADO', 'CERRADO')),
  detectado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resuelto_at TIMESTAMPTZ,
  creado_por TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_folio ON public.tickets(folio);
CREATE INDEX IF NOT EXISTS idx_tickets_site_id ON public.tickets(site_id);
CREATE INDEX IF NOT EXISTS idx_tickets_codigo_site ON public.tickets(codigo_site);
CREATE INDEX IF NOT EXISTS idx_tickets_estado ON public.tickets(estado);
CREATE INDEX IF NOT EXISTS idx_tickets_detectado_at ON public.tickets(detectado_at DESC);

-- ===================================================
-- PASO 7: Crear tabla de asignaciones de tickets
-- ===================================================

CREATE TABLE IF NOT EXISTS public.ticket_asignacion (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  cuadrilla_id TEXT NOT NULL REFERENCES public.cuadrillas(id) ON DELETE CASCADE,
  asignado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ventana_inicio TIMESTAMPTZ,
  ventana_fin TIMESTAMPTZ,
  eta TIMESTAMPTZ,
  arribo_at TIMESTAMPTZ,
  salida_at TIMESTAMPTZ,
  arribo_en_ventana BOOLEAN,
  latitud_arribo DOUBLE PRECISION,
  longitud_arribo DOUBLE PRECISION,
  razon_retraso TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_asignacion_ticket ON public.ticket_asignacion(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_asignacion_cuadrilla ON public.ticket_asignacion(cuadrilla_id);
CREATE INDEX IF NOT EXISTS idx_ticket_asignacion_asignado_at ON public.ticket_asignacion(asignado_at DESC);

-- ===================================================
-- PASO 8: Crear función y trigger para updated_at
-- ===================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tickets_updated_at ON public.tickets;
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ===================================================
-- PASO 9: Habilitar RLS en todas las tablas
-- ===================================================

ALTER TABLE public.catalogo_descripcion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogo_tipo_falla ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuadrillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tecnicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuadrilla_tecnico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_asignacion ENABLE ROW LEVEL SECURITY;

-- ===================================================
-- PASO 10: Crear políticas temporales para testing (anon)
-- ===================================================

-- Políticas para catalogo_descripcion
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='catalogo_descripcion' AND policyname='catalogo_descripcion_all_anon') THEN
    CREATE POLICY "catalogo_descripcion_all_anon" ON public.catalogo_descripcion FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END$$;

-- Políticas para catalogo_tipo_falla
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='catalogo_tipo_falla' AND policyname='catalogo_tipo_falla_all_anon') THEN
    CREATE POLICY "catalogo_tipo_falla_all_anon" ON public.catalogo_tipo_falla FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END$$;

-- Políticas para sites
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sites' AND policyname='sites_all_anon') THEN
    CREATE POLICY "sites_all_anon" ON public.sites FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END$$;

-- Políticas para cuadrillas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cuadrillas' AND policyname='cuadrillas_all_anon') THEN
    CREATE POLICY "cuadrillas_all_anon" ON public.cuadrillas FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END$$;

-- Políticas para tecnicos
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tecnicos' AND policyname='tecnicos_all_anon') THEN
    CREATE POLICY "tecnicos_all_anon" ON public.tecnicos FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END$$;

-- Políticas para cuadrilla_tecnico
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cuadrilla_tecnico' AND policyname='cuadrilla_tecnico_all_anon') THEN
    CREATE POLICY "cuadrilla_tecnico_all_anon" ON public.cuadrilla_tecnico FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END$$;

-- Políticas para tickets
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tickets' AND policyname='tickets_all_anon') THEN
    CREATE POLICY "tickets_all_anon" ON public.tickets FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END$$;

-- Políticas para ticket_asignacion
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ticket_asignacion' AND policyname='ticket_asignacion_all_anon') THEN
    CREATE POLICY "ticket_asignacion_all_anon" ON public.ticket_asignacion FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END$$;

-- ===================================================
-- VERIFICACIÓN
-- ===================================================

-- Listar todas las tablas creadas
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('catalogo_descripcion', 'catalogo_tipo_falla', 'sites', 'cuadrillas', 'tecnicos', 'cuadrilla_tecnico', 'tickets', 'ticket_asignacion')
ORDER BY tablename;

-- Verificar que RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('catalogo_descripcion', 'catalogo_tipo_falla', 'sites', 'cuadrillas', 'tecnicos', 'cuadrilla_tecnico', 'tickets', 'ticket_asignacion')
ORDER BY tablename;

-- ===================================================
-- NOTAS IMPORTANTES
-- ===================================================

-- 1. Ejecuta este script PRIMERO antes de SUPABASE_MIGRATION.sql
-- 2. Las políticas actuales permiten acceso total a usuarios 'anon' para testing
-- 3. En producción, cambiar políticas por basadas en auth.uid() y roles
-- 4. Después de crear las tablas, ejecuta el script de migración de datos
-- 5. La tabla tickets usa SERIAL (bigint auto-increment) para id
-- 6. Los folios deben ser únicos si se proporcionan
-- 7. El trigger updated_at se ejecuta automáticamente en cada UPDATE

-- ===================================================
-- FIN DEL SCRIPT
-- ===================================================
