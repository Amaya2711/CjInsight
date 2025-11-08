-- ===================================================
-- SUPABASE SCHEMA FIX
-- Run this script in your Supabase SQL Editor to fix schema issues
-- ===================================================

-- This script will:
-- 1. Check if tables exist
-- 2. Create them if they don't
-- 3. Add missing columns if tables exist
-- 4. Set up proper indexes and constraints

-- ===================================================
-- STEP 1: Create catalogo_descripcion if not exists
-- ===================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'catalogo_descripcion'
  ) THEN
    CREATE TABLE public.catalogo_descripcion (
      id SERIAL PRIMARY KEY,
      codigo TEXT UNIQUE NOT NULL,
      descripcion TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    RAISE NOTICE 'Created table: catalogo_descripcion';
  ELSE
    RAISE NOTICE 'Table already exists: catalogo_descripcion';
  END IF;
END $$;

-- ===================================================
-- STEP 2: Create catalogo_tipo_falla if not exists
-- ===================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'catalogo_tipo_falla'
  ) THEN
    CREATE TABLE public.catalogo_tipo_falla (
      id SERIAL PRIMARY KEY,
      codigo TEXT UNIQUE NOT NULL,
      tipo_falla TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    RAISE NOTICE 'Created table: catalogo_tipo_falla';
  ELSE
    RAISE NOTICE 'Table already exists: catalogo_tipo_falla';
  END IF;
END $$;

-- ===================================================
-- STEP 3: Create/Fix sites table
-- ===================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sites'
  ) THEN
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
    RAISE NOTICE 'Created table: sites';
  ELSE
    RAISE NOTICE 'Table already exists: sites';
    
    -- Add missing columns if they don't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'sites' AND column_name = 'nombre'
    ) THEN
      ALTER TABLE public.sites ADD COLUMN nombre TEXT NOT NULL DEFAULT 'Sin nombre';
      RAISE NOTICE 'Added column: sites.nombre';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'sites' AND column_name = 'es_principal'
    ) THEN
      ALTER TABLE public.sites ADD COLUMN es_principal BOOLEAN DEFAULT false;
      RAISE NOTICE 'Added column: sites.es_principal';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'sites' AND column_name = 'site_padre_id'
    ) THEN
      ALTER TABLE public.sites ADD COLUMN site_padre_id INTEGER REFERENCES public.sites(id) ON DELETE SET NULL;
      RAISE NOTICE 'Added column: sites.site_padre_id';
    END IF;
  END IF;
END $$;

-- Create indexes for sites
CREATE INDEX IF NOT EXISTS idx_sites_codigo ON public.sites(codigo);
CREATE INDEX IF NOT EXISTS idx_sites_region ON public.sites(region);
CREATE INDEX IF NOT EXISTS idx_sites_zona ON public.sites(zona);

-- ===================================================
-- STEP 4: Create/Fix cuadrillas table
-- ===================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'cuadrillas'
  ) THEN
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
    RAISE NOTICE 'Created table: cuadrillas';
  ELSE
    RAISE NOTICE 'Table already exists: cuadrillas';
  END IF;
END $$;

-- Create indexes for cuadrillas
CREATE INDEX IF NOT EXISTS idx_cuadrillas_zona ON public.cuadrillas(zona);
CREATE INDEX IF NOT EXISTS idx_cuadrillas_estado ON public.cuadrillas(estado);

-- ===================================================
-- STEP 5: Create/Fix tecnicos table
-- ===================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'tecnicos'
  ) THEN
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
    RAISE NOTICE 'Created table: tecnicos';
  ELSE
    RAISE NOTICE 'Table already exists: tecnicos';
  END IF;
END $$;

-- Create indexes for tecnicos
CREATE INDEX IF NOT EXISTS idx_tecnicos_zona ON public.tecnicos(zona);
CREATE INDEX IF NOT EXISTS idx_tecnicos_estado ON public.tecnicos(estado);

-- ===================================================
-- STEP 6: Create/Fix cuadrilla_tecnico table
-- ===================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'cuadrilla_tecnico'
  ) THEN
    CREATE TABLE public.cuadrilla_tecnico (
      cuadrilla_id TEXT NOT NULL REFERENCES public.cuadrillas(id) ON DELETE CASCADE,
      tecnico_id TEXT NOT NULL REFERENCES public.tecnicos(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (cuadrilla_id, tecnico_id)
    );
    RAISE NOTICE 'Created table: cuadrilla_tecnico';
  ELSE
    RAISE NOTICE 'Table already exists: cuadrilla_tecnico';
  END IF;
END $$;

-- Create indexes for cuadrilla_tecnico
CREATE INDEX IF NOT EXISTS idx_cuadrilla_tecnico_cuadrilla ON public.cuadrilla_tecnico(cuadrilla_id);
CREATE INDEX IF NOT EXISTS idx_cuadrilla_tecnico_tecnico ON public.cuadrilla_tecnico(tecnico_id);

-- ===================================================
-- STEP 7: Create/Fix tickets table
-- ===================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'tickets'
  ) THEN
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
    RAISE NOTICE 'Created table: tickets';
  ELSE
    RAISE NOTICE 'Table already exists: tickets';
  END IF;
END $$;

-- Create indexes for tickets
CREATE INDEX IF NOT EXISTS idx_tickets_folio ON public.tickets(folio);
CREATE INDEX IF NOT EXISTS idx_tickets_site_id ON public.tickets(site_id);
CREATE INDEX IF NOT EXISTS idx_tickets_codigo_site ON public.tickets(codigo_site);
CREATE INDEX IF NOT EXISTS idx_tickets_estado ON public.tickets(estado);
CREATE INDEX IF NOT EXISTS idx_tickets_detectado_at ON public.tickets(detectado_at DESC);

-- ===================================================
-- STEP 8: Create/Fix ticket_asignacion table
-- ===================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'ticket_asignacion'
  ) THEN
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
    RAISE NOTICE 'Created table: ticket_asignacion';
  ELSE
    RAISE NOTICE 'Table already exists: ticket_asignacion';
  END IF;
END $$;

-- Create indexes for ticket_asignacion
CREATE INDEX IF NOT EXISTS idx_ticket_asignacion_ticket ON public.ticket_asignacion(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_asignacion_cuadrilla ON public.ticket_asignacion(cuadrilla_id);
CREATE INDEX IF NOT EXISTS idx_ticket_asignacion_asignado_at ON public.ticket_asignacion(asignado_at DESC);

-- ===================================================
-- STEP 9: Create updated_at trigger for tickets
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
-- STEP 10: Enable RLS on all tables
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
-- STEP 11: Create permissive policies for anon access
-- ===================================================

-- Drop existing policies if they exist
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND policyname LIKE '%_anon'
      AND tablename IN ('catalogo_descripcion', 'catalogo_tipo_falla', 'sites', 'cuadrillas', 'tecnicos', 'cuadrilla_tecnico', 'tickets', 'ticket_asignacion')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    RAISE NOTICE 'Dropped policy: %.%', r.tablename, r.policyname;
  END LOOP;
END $$;

-- Create new policies
CREATE POLICY "catalogo_descripcion_all_anon" ON public.catalogo_descripcion FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "catalogo_tipo_falla_all_anon" ON public.catalogo_tipo_falla FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "sites_all_anon" ON public.sites FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "cuadrillas_all_anon" ON public.cuadrillas FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "tecnicos_all_anon" ON public.tecnicos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "cuadrilla_tecnico_all_anon" ON public.cuadrilla_tecnico FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "tickets_all_anon" ON public.tickets FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "ticket_asignacion_all_anon" ON public.ticket_asignacion FOR ALL TO anon USING (true) WITH CHECK (true);

-- ===================================================
-- STEP 12: Verify the setup
-- ===================================================
SELECT 
  '✅ Tables created/verified' AS status,
  COUNT(*) AS table_count
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name IN ('catalogo_descripcion', 'catalogo_tipo_falla', 'sites', 'cuadrillas', 'tecnicos', 'cuadrilla_tecnico', 'tickets', 'ticket_asignacion');

SELECT 
  '✅ RLS enabled on tables' AS status,
  COUNT(*) AS rls_enabled_count
FROM pg_tables 
WHERE schemaname = 'public'
  AND rowsecurity = true
  AND tablename IN ('catalogo_descripcion', 'catalogo_tipo_falla', 'sites', 'cuadrillas', 'tecnicos', 'cuadrilla_tecnico', 'tickets', 'ticket_asignacion');

SELECT 
  '✅ Policies created' AS status,
  COUNT(*) AS policy_count
FROM pg_policies 
WHERE schemaname = 'public'
  AND policyname LIKE '%_anon'
  AND tablename IN ('catalogo_descripcion', 'catalogo_tipo_falla', 'sites', 'cuadrillas', 'tecnicos', 'cuadrilla_tecnico', 'tickets', 'ticket_asignacion');

-- ===================================================
-- DONE!
-- ===================================================
-- Your database schema is now ready for the mobile app.
-- You can now run the migration from your app to populate data.
-- ===================================================
