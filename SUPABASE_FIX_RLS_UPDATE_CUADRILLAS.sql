-- ============================================
-- FIX: Permitir actualización de ubicación en tabla CUADRILLAS
-- ============================================
-- Este script permite que los usuarios autenticados actualicen
-- la latitud y longitud de su cuadrilla asignada

-- Primero, eliminar cualquier política existente de UPDATE si existe
DROP POLICY IF EXISTS "cuadrillas_update_location" ON public.cuadrillas;

-- Crear política que permita a los usuarios actualizar la ubicación de su cuadrilla
-- Un usuario puede actualizar la cuadrilla si existe un registro en la tabla usuario
-- donde usuario.id_usuario = auth.uid() y usuario.id = cuadrillas.id
CREATE POLICY "cuadrillas_update_location"
ON public.cuadrillas
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.usuario u
    WHERE u.id_usuario = auth.uid()
      AND u.id = cuadrillas.id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.usuario u
    WHERE u.id_usuario = auth.uid()
      AND u.id = cuadrillas.id
  )
);

-- Verificar las políticas activas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'cuadrillas'
ORDER BY policyname;

-- Para debugging: Verificar si un usuario puede actualizar una cuadrilla
-- Reemplazar 'YOUR_USER_UUID' con el UUID real del usuario
-- SELECT * FROM public.cuadrillas WHERE id IN (
--   SELECT id FROM public.usuario WHERE id_usuario = 'YOUR_USER_UUID'
-- );
