-- ===================================================
-- SUPABASE MIGRATION SCRIPT
-- Configuración completa de RLS, Políticas y Triggers
-- ===================================================

-- ===================================================
-- PASO 1: Habilitar RLS en todas las tablas
-- ===================================================

ALTER TABLE public.catalogo_descripcion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogo_tipo_falla ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuadrillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tecnicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuadrilla_tecnico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_asignacion ENABLE ROW LEVEL SECURITY;

-- ===================================================
-- PASO 2: Crear políticas temporales para testing (anon)
-- Estas políticas permiten acceso completo para pruebas
-- IMPORTANTE: En producción, reemplazar con políticas basadas en roles/usuarios
-- ===================================================

-- Políticas para catalogo_descripcion
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='catalogo_descripcion' AND policyname='catalogo_descripcion_select_anon') THEN
    CREATE POLICY "catalogo_descripcion_select_anon" ON public.catalogo_descripcion FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='catalogo_descripcion' AND policyname='catalogo_descripcion_insert_anon') THEN
    CREATE POLICY "catalogo_descripcion_insert_anon" ON public.catalogo_descripcion FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='catalogo_descripcion' AND policyname='catalogo_descripcion_update_anon') THEN
    CREATE POLICY "catalogo_descripcion_update_anon" ON public.catalogo_descripcion FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END$$;

-- Políticas para catalogo_tipo_falla
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='catalogo_tipo_falla' AND policyname='catalogo_tipo_falla_select_anon') THEN
    CREATE POLICY "catalogo_tipo_falla_select_anon" ON public.catalogo_tipo_falla FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='catalogo_tipo_falla' AND policyname='catalogo_tipo_falla_insert_anon') THEN
    CREATE POLICY "catalogo_tipo_falla_insert_anon" ON public.catalogo_tipo_falla FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='catalogo_tipo_falla' AND policyname='catalogo_tipo_falla_update_anon') THEN
    CREATE POLICY "catalogo_tipo_falla_update_anon" ON public.catalogo_tipo_falla FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END$$;

-- Políticas para cuadrillas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cuadrillas' AND policyname='cuadrillas_select_anon') THEN
    CREATE POLICY "cuadrillas_select_anon" ON public.cuadrillas FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cuadrillas' AND policyname='cuadrillas_insert_anon') THEN
    CREATE POLICY "cuadrillas_insert_anon" ON public.cuadrillas FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cuadrillas' AND policyname='cuadrillas_update_anon') THEN
    CREATE POLICY "cuadrillas_update_anon" ON public.cuadrillas FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END$$;

-- Políticas para tecnicos
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tecnicos' AND policyname='tecnicos_select_anon') THEN
    CREATE POLICY "tecnicos_select_anon" ON public.tecnicos FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tecnicos' AND policyname='tecnicos_insert_anon') THEN
    CREATE POLICY "tecnicos_insert_anon" ON public.tecnicos FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tecnicos' AND policyname='tecnicos_update_anon') THEN
    CREATE POLICY "tecnicos_update_anon" ON public.tecnicos FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END$$;

-- Políticas para cuadrilla_tecnico
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cuadrilla_tecnico' AND policyname='cuadrilla_tecnico_select_anon') THEN
    CREATE POLICY "cuadrilla_tecnico_select_anon" ON public.cuadrilla_tecnico FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cuadrilla_tecnico' AND policyname='cuadrilla_tecnico_insert_anon') THEN
    CREATE POLICY "cuadrilla_tecnico_insert_anon" ON public.cuadrilla_tecnico FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cuadrilla_tecnico' AND policyname='cuadrilla_tecnico_update_anon') THEN
    CREATE POLICY "cuadrilla_tecnico_update_anon" ON public.cuadrilla_tecnico FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cuadrilla_tecnico' AND policyname='cuadrilla_tecnico_delete_anon') THEN
    CREATE POLICY "cuadrilla_tecnico_delete_anon" ON public.cuadrilla_tecnico FOR DELETE TO anon USING (true);
  END IF;
END$$;

-- Políticas para sites
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sites' AND policyname='sites_select_anon') THEN
    CREATE POLICY "sites_select_anon" ON public.sites FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sites' AND policyname='sites_insert_anon') THEN
    CREATE POLICY "sites_insert_anon" ON public.sites FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sites' AND policyname='sites_update_anon') THEN
    CREATE POLICY "sites_update_anon" ON public.sites FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END$$;

-- Políticas para tickets
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tickets' AND policyname='tickets_select_anon') THEN
    CREATE POLICY "tickets_select_anon" ON public.tickets FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tickets' AND policyname='tickets_insert_anon') THEN
    CREATE POLICY "tickets_insert_anon" ON public.tickets FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tickets' AND policyname='tickets_update_anon') THEN
    CREATE POLICY "tickets_update_anon" ON public.tickets FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END$$;

-- Políticas para ticket_asignacion
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ticket_asignacion' AND policyname='ticket_asignacion_select_anon') THEN
    CREATE POLICY "ticket_asignacion_select_anon" ON public.ticket_asignacion FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ticket_asignacion' AND policyname='ticket_asignacion_insert_anon') THEN
    CREATE POLICY "ticket_asignacion_insert_anon" ON public.ticket_asignacion FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ticket_asignacion' AND policyname='ticket_asignacion_update_anon') THEN
    CREATE POLICY "ticket_asignacion_update_anon" ON public.ticket_asignacion FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END$$;

-- ===================================================
-- PASO 3: Crear función y trigger para updated_at automático
-- ===================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a tabla tickets (única con updated_at)
DROP TRIGGER IF EXISTS update_tickets_updated_at ON public.tickets;
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ===================================================
-- PASO 4: Verificación de estructura
-- ===================================================

-- Ver todas las tablas y sus políticas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Ver triggers activos
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;

-- ===================================================
-- PASO 5: Conteo de registros (ejecutar después de migración)
-- ===================================================

SELECT 'tickets' AS entidad, COUNT(*) AS total FROM public.tickets
UNION ALL SELECT 'sites', COUNT(*) FROM public.sites
UNION ALL SELECT 'cuadrillas', COUNT(*) FROM public.cuadrillas
UNION ALL SELECT 'tecnicos', COUNT(*) FROM public.tecnicos
UNION ALL SELECT 'ticket_asignacion', COUNT(*) FROM public.ticket_asignacion
UNION ALL SELECT 'cuadrilla_tecnico', COUNT(*) FROM public.cuadrilla_tecnico
UNION ALL SELECT 'catalogo_descripcion', COUNT(*) FROM public.catalogo_descripcion
UNION ALL SELECT 'catalogo_tipo_falla', COUNT(*) FROM public.catalogo_tipo_falla;

-- ===================================================
-- NOTAS IMPORTANTES
-- ===================================================

-- 1. Las políticas actuales permiten acceso total a usuarios 'anon'
--    Esto es SOLO para testing. En producción, reemplazar con:
--    - Políticas basadas en auth.uid()
--    - Políticas por rol (técnico, supervisor, admin)
--    - Filtros por zona/región si aplica

-- 2. Para endurecer seguridad en producción, reemplazar las políticas con algo como:
--    CREATE POLICY "usuarios_propios" ON public.tickets 
--      FOR SELECT TO authenticated 
--      USING (auth.uid() = user_id);

-- 3. El trigger de updated_at se ejecuta automáticamente en cada UPDATE

-- 4. Después de ejecutar este script:
--    - Probar la migración desde la app móvil
--    - Verificar que los conteos coincidan
--    - Confirmar que las operaciones CRUD funcionan
--    - Cuando esté estable, endurecer las políticas RLS

-- ===================================================
-- FIN DEL SCRIPT
-- ===================================================
