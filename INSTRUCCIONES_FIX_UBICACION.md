# Solución: Actualización de ubicación en tabla CUADRILLAS no funciona

## Problema identificado

La ubicación actual (-12.061280, -77.074107) se muestra correctamente en la app pero **NO se está actualizando** en la tabla `PUBLIC.CUADRILLAS` para el ID 121.

## Causa raíz

Las **políticas RLS (Row Level Security)** en Supabase están bloqueando la operación UPDATE en la tabla `cuadrillas`. 

Aunque existe una política de lectura (`cuadrillas_read_my_team`), NO existe una política que permita **actualizar** (UPDATE) los campos `latitud` y `longitud`.

## Solución

### Paso 1: Ejecutar el script SQL en Supabase

1. Abre el **SQL Editor** en tu proyecto de Supabase
2. Copia y pega el contenido del archivo `SUPABASE_FIX_RLS_UPDATE_CUADRILLAS.sql`
3. Ejecuta el script (botón **Run** o Ctrl+Enter)

Este script:
- ✅ Crea una política llamada `cuadrillas_update_location`
- ✅ Permite que los usuarios actualicen SOLO la cuadrilla que tienen asignada
- ✅ Verifica que `usuario.id_usuario = auth.uid()` y `usuario.id = cuadrillas.id`

### Paso 2: Verificar que la política se creó correctamente

En el SQL Editor, ejecuta:

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'cuadrillas'
ORDER BY policyname;
```

Deberías ver al menos estas políticas:
- `cuadrillas_read_my_team` (SELECT)
- `cuadrillas_update_location` (UPDATE) ← **Nueva política**

### Paso 3: Verificar que el usuario tiene una sesión activa

⚠️ **IMPORTANTE**: El usuario debe estar autenticado con Supabase Auth para que RLS funcione.

Actualmente, el código usa autenticación directa contra la tabla `usuario` pero **NO** crea una sesión en Supabase Auth.

**Verifica en los logs de la app**:
- Busca mensajes como: `[AUTH] Usuario encontrado:`
- Busca mensajes como: `[BackgroundLocation] 🔄 ENVIANDO ACTUALIZACIÓN A SUPABASE...`
- Busca mensajes como: `[Cuadrillas] ⚠️ No se actualizó ningún registro!`

Si ves el último mensaje, significa que RLS está bloqueando la actualización.

## Alternativa: Deshabilitar RLS temporalmente (solo para pruebas)

⚠️ **NO RECOMENDADO PARA PRODUCCIÓN**

Si necesitas probar rápidamente que el código funciona, puedes deshabilitar temporalmente RLS:

```sql
-- SOLO PARA PRUEBAS - NO USAR EN PRODUCCIÓN
ALTER TABLE public.cuadrillas DISABLE ROW LEVEL SECURITY;
```

Para volver a habilitarlo:

```sql
ALTER TABLE public.cuadrillas ENABLE ROW LEVEL SECURITY;
```

## Verificación final

1. Reinicia la app
2. Presiona **"Iniciar seguimiento"**
3. Espera 5 segundos
4. Verifica en Supabase que los campos `latitud` y `longitud` del ID 121 se actualizaron

En los logs deberías ver:
```
[Cuadrillas] ✅ ¡CUADRILLA ACTUALIZADA EXITOSAMENTE!
[Cuadrillas] ✅ ID actualizado: 121
[Cuadrillas] ✅ Nueva LATITUD: -12.061280
[Cuadrillas] ✅ Nueva LONGITUD: -77.074107
```

## Problema adicional: Autenticación con Supabase Auth

El código actual **NO** usa Supabase Auth (`auth.uid()`). Usa autenticación directa contra la tabla `usuario`.

Esto significa que las políticas RLS que dependen de `auth.uid()` **NO FUNCIONARÁN**.

### Solución completa:

Hay dos opciones:

#### Opción A: Usar Service Role Key (bypass RLS)

En el archivo `.env`, agrega:

```env
EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aquí
```

Y crea un cliente especial para operaciones que necesiten bypass de RLS:

```typescript
// utils/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
```

⚠️ **NUNCA** expongas la Service Role Key en el código del cliente. Solo úsala en operaciones del servidor.

#### Opción B: Integrar con Supabase Auth (RECOMENDADO)

Modificar el login para crear una sesión de Supabase Auth:

1. Crear usuarios en `auth.users` para cada usuario en la tabla `usuario`
2. Usar `supabase.auth.signInWithPassword()` en lugar de consulta directa
3. Las políticas RLS funcionarán con `auth.uid()`

Esta opción requiere cambios más profundos en el código de autenticación.

## Contacto

Si el problema persiste después de aplicar estas soluciones, revisa:
1. Los logs de consola de la app
2. Los logs de Supabase (Dashboard → Logs → API)
3. Que el usuario 130a1917-d6f1-4d1e-87eb-cc90b90ea047 exista en la tabla `usuario` con `id = 121`
