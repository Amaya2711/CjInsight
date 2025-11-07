# Configuración de Supabase

## Problema Detectado

La aplicación no está guardando los tickets en Supabase porque:

1. **Falta configurar las variables de entorno** - Las credenciales de Supabase no están configuradas
2. **El código no manejaba correctamente las promesas** - Ya fue corregido

## Solución

### Paso 1: Configurar Variables de Entorno

1. Crea un archivo `.env` en la raíz del proyecto (al mismo nivel que `package.json`):

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

2. Reemplaza los valores con tus credenciales reales de Supabase:
   - Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
   - En Settings → API encontrarás:
     - **Project URL** → esto va en `EXPO_PUBLIC_SUPABASE_URL`
     - **anon/public key** → esto va en `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Paso 2: Reiniciar el Servidor

Después de crear el archivo `.env`, debes reiniciar el servidor de Expo:

```bash
# Detén el servidor actual (Ctrl+C)
# Luego ejecuta:
bun start --clear
```

### Paso 3: Arreglar la Estructura de la Tabla en Supabase

**IMPORTANTE:** Si ves el error "Could not find the 'closed_at' column", significa que tu tabla en Supabase necesita actualizarse.

**Ejecuta el script `SUPABASE_FIX.sql` en tu proyecto:**

1. Abre tu proyecto en Supabase Dashboard: https://app.supabase.com
2. Ve a SQL Editor (en el menú lateral izquierdo)
3. Copia y pega TODO el contenido del archivo `SUPABASE_FIX.sql` que está en la raíz del proyecto
4. Haz clic en "Run" para ejecutar el script

Este script:
- Creará la tabla `tickets` si no existe
- Agregará las columnas faltantes si la tabla ya existe
- Configurará las políticas de RLS necesarias

**Estructura completa de la tabla:**
```sql
create table tickets (
  id text primary key,
  itsm_ref text,
  priority text not null,
  status text not null,
  site_id text not null,
  is_dependent boolean not null default false,
  opened_at timestamptz not null,
  neutralized_at timestamptz,
  closed_at timestamptz,
  sla_deadline_at timestamptz,
  exclusion_cause text,
  recurrence_flag boolean not null default false,
  description text not null,
  intervention_type text,
  created_at timestamptz default now()
);
```

### Paso 4: Verificar las Políticas de Seguridad (RLS)

✅ **Las políticas de RLS ya están incluidas en el script `SUPABASE_FIX.sql`**

Si ejecutaste el script del Paso 3, ya tienes configuradas las políticas necesarias para:
- Insertar tickets (INSERT)
- Leer tickets (SELECT)  
- Actualizar tickets (UPDATE)
- Eliminar tickets (DELETE)

**Nota:** Estas políticas son permisivas (permiten acceso público). En producción, deberías configurar políticas más restrictivas basadas en autenticación de usuarios.

### Paso 5: Verificar en la Consola

Después de crear un ticket, verifica los logs en la consola de desarrollo:

1. Busca mensajes que comiencen con `[Supabase]`
2. Deberías ver:
   - `[Supabase] Environment check: URL exists: true, Key exists: true`
   - `[Supabase] Client created successfully`
   - `[Supabase] Attempting to insert ticket: tck-XX`
   - `[Supabase] Ticket inserted successfully: [...]`

Si ves errores, los mensajes te indicarán qué está fallando.

## Verificar que Funciona

1. Crea un nuevo ticket desde la app
2. Ve a Supabase Dashboard → Table Editor → tickets
3. Deberías ver el nuevo ticket en la tabla

## Problemas Comunes

### Error: "Missing Supabase environment variables"
- Verifica que el archivo `.env` existe y tiene las variables correctas
- Reinicia el servidor de Expo después de crear el archivo

### Error: "new row violates row-level security policy"
- Necesitas configurar las políticas de RLS (ver Paso 4)
- O temporalmente deshabilitar RLS en la tabla

### Error: "relation 'tickets' does not exist"
- La tabla no existe en Supabase
- Ejecuta el script `SUPABASE_FIX.sql` como se indica en el Paso 3

### Error: "Could not find the 'closed_at' column"
- Tu tabla existe pero le faltan columnas
- Ejecuta el script `SUPABASE_FIX.sql` para agregar las columnas faltantes
- El script es seguro de ejecutar múltiples veces, solo agrega lo que falta

### Los tickets se guardan localmente pero no en Supabase
- Verifica la consola del navegador/app para ver errores específicos
- Los tickets siempre se guardan primero localmente (AsyncStorage)
- La sincronización con Supabase es asíncrona e independiente

## Mejoras Implementadas

El código ahora incluye:

1. ✅ **Logging detallado** - Todos los intentos de guardar se registran en consola
2. ✅ **Manejo de errores robusto** - Los errores de Supabase no afectan el guardado local
3. ✅ **Información de debugging** - Mensajes claros sobre qué está pasando
4. ✅ **Uso correcto de async/await** - Las promesas se manejan correctamente

## Siguiente Paso

Una vez que confirmes que los tickets se están guardando en Supabase, puedes implementar:
- Sincronización bidireccional (cargar tickets desde Supabase)
- Manejo de conflictos
- Sincronización de otros datos (dispatches, evidence, etc.)
