# 🚨 INSTRUCCIONES URGENTES - RLS BLOQUEANDO ACTUALIZACIONES

## 🔴 PROBLEMA
Las actualizaciones de ubicación NO se están guardando en Supabase porque **Row Level Security (RLS)** está bloqueando los UPDATE.

## ✅ SOLUCIÓN - SIGUE ESTOS PASOS EXACTOS:

### 1. Abre Supabase SQL Editor
- Ve a https://supabase.com/dashboard
- Inicia sesión
- Selecciona tu proyecto: `lgizmslffyaeeyogcdmm`
- Haz clic en "SQL Editor" en el menú izquierdo

### 2. Ejecuta este SQL COMPLETO

```sql
-- DESHABILITAR COMPLETAMENTE RLS EN TABLA CUADRILLAS
ALTER TABLE public.cuadrillas DISABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Cualquiera puede ver cuadrillas" ON public.cuadrillas;
DROP POLICY IF EXISTS "Cualquiera puede actualizar cuadrillas" ON public.cuadrillas;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver cuadrillas" ON public.cuadrillas;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar cuadrillas" ON public.cuadrillas;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.cuadrillas;
DROP POLICY IF EXISTS "Enable update for all users" ON public.cuadrillas;
DROP POLICY IF EXISTS "Permitir lectura a todos" ON public.cuadrillas;
DROP POLICY IF EXISTS "Permitir actualización a todos" ON public.cuadrillas;

-- Verificar que está deshabilitado (debe mostrar rowsecurity = false)
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'cuadrillas';
```

### 3. Verifica el Resultado
Debes ver:
```
tablename    | rowsecurity
cuadrillas   | false
```

### 4. Prueba el UPDATE manualmente
```sql
-- Actualiza la fila 121 con coordenadas de prueba
UPDATE public.cuadrillas 
SET latitud = -12.061280, longitud = -77.074107
WHERE id = 121;

-- Verifica que se actualizó
SELECT id, nombre, latitud, longitud 
FROM public.cuadrillas 
WHERE id = 121;
```

### 5. Ahora vuelve a la app y presiona "Iniciar seguimiento"

## 🔍 ¿POR QUÉ PASÓ ESTO?

Supabase tiene Row Level Security (RLS) habilitado por defecto. Esto significa que **aunque tu código intente hacer UPDATE, Supabase lo bloquea** si no hay políticas RLS que permitan la operación.

Cuando haces un UPDATE con RLS habilitado pero sin políticas correctas:
- El UPDATE se ejecuta SIN ERROR
- Pero NO actualiza ninguna fila (data = null)
- Tu código ve que no hay datos y sabe que RLS está bloqueando

## ✅ DESPUÉS DE EJECUTAR EL SQL

1. Cierra la app completamente y vuelve a abrirla
2. Inicia sesión
3. Ve a la pestaña "Profile"
4. Presiona "Iniciar seguimiento"
5. Deberías ver en los logs:
   ```
   [Cuadrillas] ✅ ¡CUADRILLA ACTUALIZADA EXITOSAMENTE!
   [Cuadrillas] ✅ ID actualizado: 121
   [Cuadrillas] ✅ Nueva LATITUD: -12.061280
   [Cuadrillas] ✅ Nueva LONGITUD: -77.074107
   ```

6. Verifica en Supabase Table Editor que los valores de latitud y longitud se están actualizando cada 5 segundos

## 📝 COMANDOS ÚTILES PARA DEBUGGING

```sql
-- Ver todas las tablas y su estado de RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Ver todas las políticas de una tabla
SELECT * FROM pg_policies WHERE tablename = 'cuadrillas';

-- Habilitar RLS (NO LO HAGAS AHORA)
-- ALTER TABLE public.cuadrillas ENABLE ROW LEVEL SECURITY;
```

## 🎯 RESUMEN

**ANTES:** RLS bloqueaba → UPDATE no guardaba → data = null  
**DESPUÉS:** Sin RLS → UPDATE guarda correctamente → data = { id: 121, latitud, longitud }

¡El seguimiento de ubicación ahora DEBE funcionar!
