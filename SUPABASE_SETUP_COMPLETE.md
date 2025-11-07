# Configuración Completa de Supabase

## Error Actual
```
[Sync] ❌ Error loading tickets: Could not find the table 'public.tickets' in the schema cache
```

Este error indica que las tablas no existen en tu base de datos Supabase.

## Solución: Ejecutar Scripts en Orden

### PASO 1: Crear las Tablas
1. Abre [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **SQL Editor** (menú izquierdo)
4. Crea una nueva query
5. Copia y pega **TODO** el contenido de `SUPABASE_CREATE_TABLES.sql`
6. Haz clic en **RUN** (o presiona Ctrl/Cmd + Enter)

✅ **Resultado esperado:** Deberías ver un mensaje de éxito y una lista de 8 tablas creadas:
- catalogo_descripcion
- catalogo_tipo_falla
- sites
- cuadrillas
- tecnicos
- cuadrilla_tecnico
- tickets
- ticket_asignacion

### PASO 2: Verificar las Tablas
En el SQL Editor, ejecuta:

```sql
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name IN ('catalogo_descripcion', 'catalogo_tipo_falla', 'sites', 'cuadrillas', 'tecnicos', 'cuadrilla_tecnico', 'tickets', 'ticket_asignacion')
ORDER BY table_name;
```

Deberías ver las 8 tablas listadas.

### PASO 3: Verificar RLS (Row Level Security)
```sql
SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('catalogo_descripcion', 'catalogo_tipo_falla', 'sites', 'cuadrillas', 'tecnicos', 'cuadrilla_tecnico', 'tickets', 'ticket_asignacion')
ORDER BY tablename;
```

Todas las tablas deberían tener `rowsecurity = true`.

### PASO 4: Verificar Políticas
```sql
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Deberías ver políticas `*_all_anon` para cada tabla.

### PASO 5: Probar la App
1. Cierra y vuelve a abrir la app móvil
2. La app debería conectarse a Supabase sin errores
3. Puedes usar el botón "Migrar a Supabase" si aún tienes datos locales

## Estructura de las Tablas Creadas

### tickets
- **id**: SERIAL (auto-increment)
- **folio**: TEXT UNIQUE (puede ser null)
- **site_id**: INTEGER (FK a sites)
- **codigo_site**: TEXT
- **descripcion**: TEXT NOT NULL
- **tipo_falla**: TEXT NOT NULL
- **detalle**: TEXT
- **severidad**: ENUM ('BAJA', 'MEDIA', 'MEDIA-ALTA', 'ALTA')
- **estado**: ENUM ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADO', 'CERRADO')
- **detectado_at**: TIMESTAMPTZ
- **resuelto_at**: TIMESTAMPTZ
- **creado_por**: TEXT
- **updated_at**: TIMESTAMPTZ (auto-actualizado con trigger)

### sites
- **id**: SERIAL
- **codigo**: TEXT UNIQUE
- **nombre**: TEXT
- **tipologia**: TEXT
- **region**: TEXT
- **zona**: TEXT
- Coordenadas: latitud, longitud
- Relación jerárquica: site_padre_id

### cuadrillas
- **id**: TEXT (UUID)
- **nombre**: TEXT
- **email**: TEXT
- **zona**: TEXT
- **estado**: TEXT ('disponible', 'ocupado', 'fuera_servicio')
- **tipo**: TEXT ('REGULAR', 'CHOQUE')
- Ubicación: latitud_actual, longitud_actual

### tecnicos
- **id**: TEXT (UUID)
- **nombre**: TEXT
- **email**: TEXT
- **telefono**: TEXT
- **rol**: TEXT
- **tipo_usuario**: TEXT
- **zona**: TEXT
- **estado**: TEXT

### cuadrilla_tecnico
- **cuadrilla_id**: TEXT (FK)
- **tecnico_id**: TEXT (FK)
- Tabla de relación muchos-a-muchos

### ticket_asignacion
- **id**: SERIAL
- **ticket_id**: INTEGER (FK)
- **cuadrilla_id**: TEXT (FK)
- **asignado_at**: TIMESTAMPTZ
- Información de ventana, arribo, salida

### Catálogos
- **catalogo_descripcion**: id, codigo, descripcion
- **catalogo_tipo_falla**: id, codigo, tipo_falla

## Seguridad (Temporal)

⚠️ **IMPORTANTE:** Las políticas actuales permiten acceso completo para usuarios anónimos (`anon`). Esto es **solo para desarrollo/testing**.

En producción, debes cambiar las políticas para:
- Basarlas en `auth.uid()` (usuarios autenticados)
- Filtrar por roles (técnico, supervisor, admin)
- Limitar acceso por zona/región

## Próximos Pasos

Una vez que las tablas estén creadas:

1. ✅ La app debería cargar sin errores
2. 🔄 Usa el botón "Migrar a Supabase" para subir datos locales
3. 📊 Verifica que los conteos coincidan
4. 🔒 Cuando esté estable, endurece las políticas RLS

## Comandos Útiles

### Ver conteos de registros
```sql
SELECT 'tickets' AS entidad, COUNT(*) AS total FROM public.tickets
UNION ALL SELECT 'sites', COUNT(*) FROM public.sites
UNION ALL SELECT 'cuadrillas', COUNT(*) FROM public.cuadrillas
UNION ALL SELECT 'tecnicos', COUNT(*) FROM public.tecnicos
UNION ALL SELECT 'ticket_asignacion', COUNT(*) FROM public.ticket_asignacion
UNION ALL SELECT 'cuadrilla_tecnico', COUNT(*) FROM public.cuadrilla_tecnico
UNION ALL SELECT 'catalogo_descripcion', COUNT(*) FROM public.catalogo_descripcion
UNION ALL SELECT 'catalogo_tipo_falla', COUNT(*) FROM public.catalogo_tipo_falla;
```

### Limpiar todas las tablas (solo desarrollo)
```sql
TRUNCATE TABLE public.ticket_asignacion CASCADE;
TRUNCATE TABLE public.tickets CASCADE;
TRUNCATE TABLE public.cuadrilla_tecnico CASCADE;
TRUNCATE TABLE public.cuadrillas CASCADE;
TRUNCATE TABLE public.tecnicos CASCADE;
TRUNCATE TABLE public.sites CASCADE;
TRUNCATE TABLE public.catalogo_descripcion CASCADE;
TRUNCATE TABLE public.catalogo_tipo_falla CASCADE;
```

## Soporte

Si sigues teniendo problemas:
1. Verifica que ejecutaste el script completo
2. Revisa la consola del navegador (F12) para ver errores específicos
3. Verifica las credenciales en `.env` o `utils/supabase.ts`
4. Asegúrate de que el proyecto Supabase esté activo
