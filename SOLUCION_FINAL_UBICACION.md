# 🔧 Solución Final: Ubicación no se actualiza en tabla CUADRILLAS

## 🔍 Problema

La app muestra la ubicación actual correctamente:
- **Lat:** -12.061280
- **Lng:** -77.074107
- **Cuadrilla ID:** 121

Pero estos valores **NO** se actualizan en la base de datos Supabase (tabla `PUBLIC.CUADRILLAS`).

## ✅ Causa Raíz Identificada

El problema es **Row Level Security (RLS)** en Supabase:

1. Tu app **NO** usa Supabase Auth (`auth.signInWithPassword`)
2. Las políticas RLS existentes requieren `auth.uid()` que retorna `null`
3. Por lo tanto, Supabase **BLOQUEA** todas las operaciones UPDATE

## 🚀 Solución (Ejecutar en SQL Editor de Supabase)

### Paso 1: Abrir SQL Editor en Supabase

1. Ve a tu proyecto en https://supabase.com
2. En el menú lateral, haz clic en **SQL Editor**
3. Crea una nueva query

### Paso 2: Ejecutar este comando

```sql
-- Deshabilitar RLS en la tabla cuadrillas
ALTER TABLE public.cuadrillas DISABLE ROW LEVEL SECURITY;
```

Presiona **Run** (o Ctrl+Enter) para ejecutar.

### Paso 3: Verificar que se aplicó

```sql
-- Verificar que RLS está deshabilitado
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'cuadrillas';
```

Deberías ver: `rls_enabled = false` ✅

## 🧪 Probar la solución

1. **Reinicia** la app en tu dispositivo
2. Ve a la pantalla de **Perfil**
3. Presiona **"Iniciar seguimiento"**
4. Espera **5-10 segundos**
5. Ve a Supabase → **Table Editor** → Tabla **cuadrillas**
6. Busca el registro con **id = 121**
7. Verifica que `latitud` y `longitud` se actualizaron con tus coordenadas

## 📋 Verificación en logs de la app

En la consola de la app, deberías ver:

```
[BackgroundLocation] 📍 NUEVA CUADRILLAS-LATITUD: -12.061280
[BackgroundLocation] 📍 NUEVA CUADRILLAS-LONGITUD: -77.074107
[BackgroundLocation] 🔄 ENVIANDO ACTUALIZACIÓN A SUPABASE...
[Cuadrillas] 🔄 ACTUALIZANDO CUADRILLA
[Cuadrillas] 🎯 ID recibido: 121
[Cuadrillas] ✅ ¡CUADRILLA ACTUALIZADA EXITOSAMENTE!
[BackgroundLocation] ✅ Ubicación actualizada en Supabase exitosamente
```

## ⚠️ Si el problema persiste

### Opción A: Verificar que el usuario está en la tabla

```sql
SELECT * FROM public.usuario WHERE id_usuario = '130a1917-d6f1-4d1e-87eb-cc90b90ea047';
```

Verifica que:
- ✅ El campo `id` sea `121`
- ✅ El campo `nombre_usuario` coincida con tu login

### Opción B: Verificar que la cuadrilla existe

```sql
SELECT * FROM public.cuadrillas WHERE id = 121;
```

Debe retornar un registro.

### Opción C: Probar actualización manual

```sql
UPDATE public.cuadrillas 
SET latitud = -12.061280, longitud = -77.074107 
WHERE id = 121;

SELECT id, nombre, latitud, longitud FROM public.cuadrillas WHERE id = 121;
```

Si esto funciona, el problema era definitivamente RLS.

## 🔐 Nota de Seguridad

Deshabilitar RLS significa que **cualquier persona con tu anon key** puede leer y modificar la tabla `cuadrillas`.

Para un sistema interno esto generalmente está bien, pero si necesitas mayor seguridad:

1. Implementa autenticación con Supabase Auth
2. Usa políticas RLS basadas en `auth.uid()`
3. O usa la Service Role Key solo en el backend

## 📞 Contacto

Si después de ejecutar el SQL el problema persiste:

1. Comparte los logs de consola de la app
2. Comparte una captura de los resultados de las queries SQL
3. Verifica que estás usando la URL correcta: `lgizmslffyaeeyogcdmm.supabase.co`

---

**Archivo SQL completo:** `SUPABASE_SIMPLE_FIX_RLS.sql`

**Instrucciones detalladas:** `INSTRUCCIONES_FIX_UBICACION.md`
