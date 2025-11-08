# Errores Corregidos

## Resumen de los problemas encontrados y sus soluciones

### 1. ❌ Error: "Could not find the table 'public.tickets' in the schema cache"

**Causa**: La tabla `tickets` no existe en Supabase o el esquema no está correctamente configurado.

**Solución**: 
- Ejecutar el script `SUPABASE_SCHEMA_FIX.sql` en el SQL Editor de Supabase
- Este script crea todas las tablas necesarias si no existen
- Configura los índices, triggers y políticas RLS correctamente

**Pasos para resolver**:
1. Abrir Supabase Dashboard: https://app.supabase.com
2. Ir a "SQL Editor"
3. Crear una nueva query
4. Copiar y pegar el contenido de `SUPABASE_SCHEMA_FIX.sql`
5. Ejecutar el script (Run)
6. Verificar que todas las tablas se crearon correctamente

---

### 2. ❌ Error: "cuadrillaDB.id.toLowerCase is not a function"

**Causa**: El campo `id` en la tabla `cuadrillas` es de tipo `TEXT` (string), pero el código intentaba usar métodos que esperaban diferentes tipos de datos.

**Solución aplicada**:
- Modificado `services/sync.ts` línea 94 para usar `String(c.id)` al buscar en el mapa de seeds
- Eliminado el código que intentaba buscar por ID numérico
- Ahora el código maneja correctamente los IDs de tipo string de la tabla cuadrillas

**Archivo modificado**: `services/sync.ts`

---

### 3. ❌ Error: "Unexpected text node: . A text node cannot be a child of a <View>"

**Causa**: React Native no permite texto directo dentro de un componente `<View>`. Todo texto debe estar envuelto en un componente `<Text>`.

**Solución aplicada**:
- Envuelto el resultado de `toLocaleString()` en `String()` para asegurar que siempre sea una cadena
- Esto previene que React intente renderizar objetos o valores no válidos directamente

**Archivo modificado**: `app/(tabs)/crews-map.tsx` línea 240

---

### 4. ⚠️ Advertencia: "Encountered two children with the same key"

**Causa**: Múltiples elementos React con claves (keys) duplicadas o vacías.

**Solución**: Este error debe desaparecer después de aplicar las correcciones anteriores, ya que las claves dependen de los IDs de las cuadrillas que ahora se manejan correctamente.

---

### 5. 🔧 Corrección adicional: Columna 'nombre' vs 'site' en tabla sites

**Causa**: El servicio `services/sites.ts` usa el nombre de columna `nombre`, pero el store `useAppStore.ts` intentaba usar `site`.

**Solución aplicada**:
- Modificado `store/useAppStore.ts` para usar `nombre` en lugar de `site`
- Eliminados campos innecesarios como `tecnologias`, `ubigeo_mtc`, `subregion`, `ccpp` que no están en el esquema
- Ahora los inserts coinciden con la estructura real de la base de datos

**Archivos modificados**: 
- `store/useAppStore.ts` líneas 352, 446
- `services/sites.ts` (ya estaba correcto)

---

## Pasos para verificar que todo funciona

### Paso 1: Ejecutar el script SQL
```bash
# Ve a Supabase Dashboard → SQL Editor
# Copia y pega SUPABASE_SCHEMA_FIX.sql
# Ejecuta el script
```

### Paso 2: Verificar las tablas creadas
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'catalogo_descripcion',
    'catalogo_tipo_falla', 
    'sites',
    'cuadrillas',
    'tecnicos',
    'cuadrilla_tecnico',
    'tickets',
    'ticket_asignacion'
  );
```

Deberías ver las 8 tablas listadas.

### Paso 3: Verificar que RLS está habilitado
```sql
SELECT tablename, rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN (
    'catalogo_descripcion',
    'catalogo_tipo_falla',
    'sites',
    'cuadrillas',
    'tecnicos',
    'cuadrilla_tecnico',
    'tickets',
    'ticket_asignacion'
  );
```

Todas las tablas deben tener `rowsecurity = true`.

### Paso 4: Reiniciar la app móvil
```bash
# Detener la app
# Limpiar caché si es necesario
# Volver a iniciar
```

### Paso 5: Verificar en consola
Deberías ver estos logs sin errores:
```
[Sync] 📥 Loading initial data from Supabase...
[Sync] ✅ Loaded X sites
[Sync] ✅ Loaded X tickets
[Sync] ✅ Loaded X crews with Y having location
[Store] ✅ Store initialized from Supabase successfully
```

---

## Estructura de las tablas

### sites
- `id`: SERIAL (auto-incremento)
- `codigo`: TEXT (único, ej: "LC8003")
- `nombre`: TEXT (nombre del sitio)
- `tipologia`: TEXT
- `region`: TEXT
- `zona`: TEXT
- `departamento`: TEXT
- `provincia`: TEXT
- `distrito`: TEXT
- `direccion`: TEXT
- `latitud`: DOUBLE PRECISION
- `longitud`: DOUBLE PRECISION
- `es_principal`: BOOLEAN
- `site_padre_id`: INTEGER (FK a sites)
- `created_at`: TIMESTAMPTZ

### cuadrillas
- `id`: TEXT (PK, ej: "1", "2", "crew-001")
- `nombre`: TEXT
- `email`: TEXT
- `zona`: TEXT
- `estado`: TEXT ('disponible', 'ocupado', 'fuera_servicio')
- `tipo`: TEXT ('REGULAR', 'CHOQUE')
- `latitud_actual`: DOUBLE PRECISION
- `longitud_actual`: DOUBLE PRECISION
- `ultima_ubicacion_at`: TIMESTAMPTZ
- `departamento`: TEXT
- `base`: TEXT
- `es_interzonal`: BOOLEAN
- `created_at`: TIMESTAMPTZ

### tickets
- `id`: SERIAL (auto-incremento)
- `folio`: TEXT (único, ej: "tck-01")
- `site_id`: INTEGER (FK a sites)
- `codigo_site`: TEXT
- `descripcion`: TEXT (tipo de intervención)
- `tipo_falla`: TEXT (descripción del problema)
- `detalle`: TEXT
- `severidad`: TEXT ('BAJA', 'MEDIA', 'MEDIA-ALTA', 'ALTA')
- `estado`: TEXT ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADO', 'CERRADO')
- `detectado_at`: TIMESTAMPTZ
- `resuelto_at`: TIMESTAMPTZ
- `creado_por`: TEXT
- `updated_at`: TIMESTAMPTZ

---

## Próximos pasos

1. ✅ Ejecutar `SUPABASE_SCHEMA_FIX.sql` en Supabase
2. ✅ Verificar que las tablas se crearon correctamente
3. ✅ Reiniciar la app móvil
4. 🔄 Migrar datos locales a Supabase (usar el botón "Migrar a Supabase" en la app si está disponible)
5. 🧪 Probar crear tickets, sites y asignaciones para verificar que todo funciona

---

## Soporte

Si encuentras más errores:
1. Verifica los logs en la consola de la app
2. Verifica los logs en Supabase Dashboard → Logs
3. Asegúrate de que las credenciales en `utils/supabase.ts` son correctas
4. Verifica que el proyecto Supabase está activo y no pausado
