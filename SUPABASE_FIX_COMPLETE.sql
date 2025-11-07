-- ===================================================
-- COMPLETE FIX FOR SUPABASE SCHEMA
-- This script will drop and recreate all tables with the correct structure
-- ===================================================

-- WARNING: This will delete all existing data! 
-- If you have data you want to keep, backup first using:
-- pg_dump or Supabase Dashboard Export

-- ===================================================
-- STEP 1: Drop existing tables (in correct order due to foreign keys)
-- ===================================================

DROP TABLE IF EXISTS public.ticket_asignacion CASCADE;
DROP TABLE IF EXISTS public.tickets CASCADE;
DROP TABLE IF EXISTS public.cuadrilla_tecnico CASCADE;
DROP TABLE IF EXISTS public.tecnicos CASCADE;
DROP TABLE IF EXISTS public.cuadrillas CASCADE;
DROP TABLE IF EXISTS public.sites CASCADE;
DROP TABLE IF EXISTS public.catalogo_tipo_falla CASCADE;
DROP TABLE IF EXISTS public.catalogo_descripcion CASCADE;

-- ===================================================
-- STEP 2: Create tables with correct structure
-- ===================================================

-- Catálogo de descripciones
CREATE TABLE public.catalogo_descripcion (
  id SERIAL PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  descripcion TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Catálogo de tipos de falla
CREATE TABLE public.catalogo_tipo_falla (
  id SERIAL PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  tipo_falla TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sites table
CREATE TABLE public.sites (
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

CREATE INDEX idx_sites_codigo ON public.sites(codigo);
CREATE INDEX idx_sites_region ON public.sites(region);
CREATE INDEX idx_sites_zona ON public.sites(zona);

-- Cuadrillas table
CREATE TABLE public.cuadrillas (
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

CREATE INDEX idx_cuadrillas_zona ON public.cuadrillas(zona);
CREATE INDEX idx_cuadrillas_estado ON public.cuadrillas(estado);

-- Tecnicos table
CREATE TABLE public.tecnicos (
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

CREATE INDEX idx_tecnicos_zona ON public.tecnicos(zona);
CREATE INDEX idx_tecnicos_estado ON public.tecnicos(estado);

-- Cuadrilla-Tecnico relation table
CREATE TABLE public.cuadrilla_tecnico (
  cuadrilla_id TEXT NOT NULL REFERENCES public.cuadrillas(id) ON DELETE CASCADE,
  tecnico_id TEXT NOT NULL REFERENCES public.tecnicos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (cuadrilla_id, tecnico_id)
);

CREATE INDEX idx_cuadrilla_tecnico_cuadrilla ON public.cuadrilla_tecnico(cuadrilla_id);
CREATE INDEX idx_cuadrilla_tecnico_tecnico ON public.cuadrilla_tecnico(tecnico_id);

-- Tickets table
CREATE TABLE public.tickets (
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

CREATE INDEX idx_tickets_folio ON public.tickets(folio);
CREATE INDEX idx_tickets_site_id ON public.tickets(site_id);
CREATE INDEX idx_tickets_codigo_site ON public.tickets(codigo_site);
CREATE INDEX idx_tickets_estado ON public.tickets(estado);
CREATE INDEX idx_tickets_detectado_at ON public.tickets(detectado_at DESC);

-- Ticket Asignacion table
CREATE TABLE public.ticket_asignacion (
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

CREATE INDEX idx_ticket_asignacion_ticket ON public.ticket_asignacion(ticket_id);
CREATE INDEX idx_ticket_asignacion_cuadrilla ON public.ticket_asignacion(cuadrilla_id);
CREATE INDEX idx_ticket_asignacion_asignado_at ON public.ticket_asignacion(asignado_at DESC);

-- ===================================================
-- STEP 3: Create updated_at trigger
-- ===================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ===================================================
-- STEP 4: Enable RLS on all tables
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
-- STEP 5: Create permissive policies for testing (anon)
-- ===================================================

-- Catalogo Descripcion
CREATE POLICY "catalogo_descripcion_all_anon" ON public.catalogo_descripcion FOR ALL TO anon USING (true) WITH CHECK (true);

-- Catalogo Tipo Falla
CREATE POLICY "catalogo_tipo_falla_all_anon" ON public.catalogo_tipo_falla FOR ALL TO anon USING (true) WITH CHECK (true);

-- Sites
CREATE POLICY "sites_all_anon" ON public.sites FOR ALL TO anon USING (true) WITH CHECK (true);

-- Cuadrillas
CREATE POLICY "cuadrillas_all_anon" ON public.cuadrillas FOR ALL TO anon USING (true) WITH CHECK (true);

-- Tecnicos
CREATE POLICY "tecnicos_all_anon" ON public.tecnicos FOR ALL TO anon USING (true) WITH CHECK (true);

-- Cuadrilla Tecnico
CREATE POLICY "cuadrilla_tecnico_all_anon" ON public.cuadrilla_tecnico FOR ALL TO anon USING (true) WITH CHECK (true);

-- Tickets
CREATE POLICY "tickets_all_anon" ON public.tickets FOR ALL TO anon USING (true) WITH CHECK (true);

-- Ticket Asignacion
CREATE POLICY "ticket_asignacion_all_anon" ON public.ticket_asignacion FOR ALL TO anon USING (true) WITH CHECK (true);

-- ===================================================
-- STEP 6: Verify the setup
-- ===================================================

-- List all tables
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('catalogo_descripcion', 'catalogo_tipo_falla', 'sites', 'cuadrillas', 'tecnicos', 'cuadrilla_tecnico', 'tickets', 'ticket_asignacion')
ORDER BY tablename;

-- Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('catalogo_descripcion', 'catalogo_tipo_falla', 'sites', 'cuadrillas', 'tecnicos', 'cuadrilla_tecnico', 'tickets', 'ticket_asignacion')
ORDER BY tablename;

-- ===================================================
-- DONE!
-- ===================================================
-- After running this script:
-- 1. The schema will be correct and match the services
-- 2. All tables will have RLS enabled with permissive policies for testing
-- 3. Run the migration script from your app to populate data
-- ===================================================
