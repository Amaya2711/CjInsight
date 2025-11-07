-- ============================================================================
-- CONFIGURACIÓN RLS (Row Level Security) PARA USUARIO Y CUADRILLAS
-- ============================================================================
-- Este script configura las políticas de seguridad para que cada usuario
-- autenticado solo pueda ver/editar su propia fila en usuario y la cuadrilla
-- a la que pertenece.
-- ============================================================================

-- 1) Activar RLS en las tablas
ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuadrillas ENABLE ROW LEVEL SECURITY;

-- 2) ELIMINAR políticas anteriores si existen (para evitar conflictos)
DROP POLICY IF EXISTS "usuario_select_self" ON public.usuario;
DROP POLICY IF EXISTS "usuario_insert_self" ON public.usuario;
DROP POLICY IF EXISTS "usuario_update_self" ON public.usuario;
DROP POLICY IF EXISTS "cuadrillas_read_my_team" ON public.cuadrillas;
DROP POLICY IF EXISTS "cuadrillas_update_my_team" ON public.cuadrillas;

-- 3) POLÍTICAS PARA TABLA USUARIO
-- Cada usuario autenticado ve/crea/edita solo su fila (donde id_usuario = auth.uid())

CREATE POLICY "usuario_select_self"
ON public.usuario FOR SELECT TO authenticated
USING (id_usuario = auth.uid());

CREATE POLICY "usuario_insert_self"
ON public.usuario FOR INSERT TO authenticated
WITH CHECK (id_usuario = auth.uid());

CREATE POLICY "usuario_update_self"
ON public.usuario FOR UPDATE TO authenticated
USING (id_usuario = auth.uid())
WITH CHECK (id_usuario = auth.uid());

-- 4) POLÍTICAS PARA TABLA CUADRILLAS
-- Leer la cuadrilla a la que pertenece el usuario (usuario.id = cuadrillas.id)

CREATE POLICY "cuadrillas_read_my_team"
ON public.cuadrillas FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.usuario u
    WHERE u.id_usuario = auth.uid()
      AND u.id = cuadrillas.id
  )
);

-- Actualizar ubicación de la cuadrilla (latitud/longitud)
CREATE POLICY "cuadrillas_update_my_team"
ON public.cuadrillas FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.usuario u
    WHERE u.id_usuario = auth.uid()
      AND u.id = cuadrillas.id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.usuario u
    WHERE u.id_usuario = auth.uid()
      AND u.id = cuadrillas.id
  )
);

-- 5) RECARGAR SCHEMA (importante después de cambios en políticas)
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
-- NOTA: Después de ejecutar este script, espera 10-20 segundos para que
-- Supabase recargue el schema antes de hacer peticiones desde la app.
-- ============================================================================
