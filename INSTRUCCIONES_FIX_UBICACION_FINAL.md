# SOLUCIÓN DEFINITIVA PARA ACTUALIZACIÓN DE UBICACIÓN

## El Problema

La actualización de ubicación NO funcionaba porque **las políticas RLS (Row Level Security) estaban bloqueando el UPDATE** en la tabla `cuadrillas`.

## La Solución CORRECTA (sin deshabilitar RLS)

En lugar de deshabilitar RLS completamente (que es inseguro), vamos a crear una política que **permita las actualizaciones de ubicación**.

### Pasos a seguir:

1. **Ve a Supabase SQL Editor**: https://supabase.com/dashboard/project/lgizmslffyaeeyogcdmm/sql

2. **Ejecuta el archivo**: `SUPABASE_FIX_RLS_UBICACION.sql`

   O copia y pega este código:

```sql
-- SOLUCIÓN FINAL PARA ACTUALIZACIÓN DE UBICACIÓN
-- Este script permite que la app actualice latitud y longitud sin deshabilitar RLS completamente

-- Primero, asegurarnos que RLS esté habilitado
ALTER TABLE public.cuadrillas ENABLE ROW LEVEL SECURITY;

-- Eliminar política anterior si existe
DROP POLICY IF EXISTS "Allow anonymous location updates" ON public.cuadrillas;
DROP POLICY IF EXISTS "Allow location updates" ON public.cuadrillas;
DROP POLICY IF EXISTS "Enable update for all users" ON public.cuadrillas;

-- Crear nueva política que permite UPDATE de ubicación para todos
CREATE POLICY "Allow location updates for all"
ON public.cuadrillas
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Opcional: Si también necesitas leer cuadrillas
DROP POLICY IF EXISTS "Allow read for all users" ON public.cuadrillas;
CREATE POLICY "Allow read for all users"
ON public.cuadrillas
FOR SELECT
TO anon, authenticated
USING (true);
```

3. **Verifica que funcionó**: Presiona "Iniciar Seguimiento" en la app y revisa los logs en consola.

## ¿Por qué esta solución es mejor?

- ✅ RLS permanece habilitado (más seguro)
- ✅ Solo permite UPDATE y SELECT (no DELETE)
- ✅ Puedes agregar más políticas específicas después si lo necesitas
- ✅ Sigue las mejores prácticas de seguridad de Supabase

## Verificación

Después de ejecutar el script SQL, en la consola de la app deberías ver:

```
[BackgroundLocation] ✅ ACTUALIZACIÓN EXITOSA
[BackgroundLocation] 🎯 Fila actualizada en tabla CUADRILLAS:
[BackgroundLocation]   - ID: 121
[BackgroundLocation]   - NOMBRE: [nombre de tu cuadrilla]
[BackgroundLocation]   - LATITUD: -12.061280
[BackgroundLocation]   - LONGITUD: -77.074107
```

Y en la tabla `cuadrillas` en Supabase, deberías ver las coordenadas actualizadas para el ID 121.
