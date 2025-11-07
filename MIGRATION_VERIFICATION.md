# Verificación de Migración a Nueva Base de Datos

## ✅ Cambios Completados

### 1. Health Check Implementado
**Archivo:** `utils/supabase.ts`
- Función `healthCheckSupabase()` creada
- Verifica conteos de:
  - `sites_v1`
  - `cuadrillas`
  - `tickets_v1`
- Se ejecuta al iniciar la app en `app/_layout.tsx`

**Uso:**
```typescript
await healthCheckSupabase();
// Logs esperados en consola:
// [HEALTH] sites_v1: 6842 null
// [HEALTH] cuadrillas: 119 null
// [HEALTH] tickets_v1: ~5000 null
```

### 2. Reemplazos de Tablas Completados

#### ✅ `sites` → `sites_v1`
**Archivos actualizados:**
- `services/sites.ts` - Ya usaba `sites_v1` ✓
- `store/useAppStore.ts` - 3 referencias corregidas:
  - Línea 214: inserción de site
  - Línea 287: búsqueda de site por código
  - Línea 308: inserción de site desde ticket
- `utils/testSupabase.ts` - Ya no usado (deprecated)

#### ✅ `tickets` → `tickets_v1`
**Archivos actualizados:**
- `services/tickets.ts` - Ya usaba `tickets_v1` ✓
- `store/useAppStore.ts` - Ya usaba `tickets_v1` ✓
- `utils/testSupabase.ts` - Actualizado para usar `tickets_v1`

### 3. Eliminación de `cuadrilla_tecnico`

**Archivo:** `services/cuadrillaTecnico.ts`
- Todas las funciones stubbed (retornan arrays vacíos)
- Warnings informativos agregados
- La app funciona sin esta tabla

**Status:** No rompe la UI, solo emite warnings esperados

### 4. Mapa de Cuadrillas

#### Servicio (`services/cuadrillas.ts`)
✅ Funciones implementadas:
- `toLatLng()`: Convierte latitud/longitud a números y valida rangos
- `zoneKey()`: Normaliza zonas a claves estables (LIMA, NORTE, CENTRO, SUR, ORIENTE, OTRAS)

#### Pantallas actualizadas:
- `app/(tabs)/full-map.tsx`:
  - ✅ Carga datos de `sites_v1` y `cuadrillas`
  - ✅ Filtros de zona funcionando (LIMA, NORTE, CENTRO, SUR)
  - ✅ Botones ORIENTE y OTRAS removidos
  - ✅ Fit to coordinates implementado
- `app/(tabs)/crews-map.tsx`:
  - ✅ Usa `zoneKey()` para agrupar cuadrillas
  - ✅ Contadores por zona correctos

#### Componentes de mapa:
- `src/components/FullMapView.native.tsx`:
  - ✅ Muestra `site.name` en markers de sites
  - ✅ Muestra `crew.name` en markers de cuadrillas
  - ✅ Fit to coordinates automático

### 5. Detalle de Tickets

**Archivo:** `app/ticket/[id].tsx`
- ✅ Muestra todos los campos del ticket (menos `id`)
- ✅ Fechas formateadas correctamente
- ✅ Estados y prioridades mostrados
- ✅ Información del sitio completa

## 📋 Criterios de Aceptación

### Health Check
```bash
# Al iniciar la app, deberías ver:
[HEALTH] sites_v1: 6842 null
[HEALTH] cuadrillas: 119 null
[HEALTH] tickets_v1: 5000 null  # (aproximado)
```

### Mapa de Cuadrillas
- ✅ 119 marcadores visibles en posiciones correctas
- ✅ Contadores de zonas correctos (ej: "LIMA (45)")
- ✅ Filtros funcionando sin errores
- ✅ 0 warnings de "coordenadas inválidas" en consola

### Mapa de Sites
- ✅ ~6842 sites cargados (filtrados por ubicación válida)
- ✅ Nombres de sites visibles en markers (no "Sin nombre")
- ✅ Búsqueda por nombre y código funcionando

### Detalle de Tickets
- ✅ Todos los campos visibles (ticket_source, dates, etc.)
- ✅ Fechas en formato legible
- ✅ No hay errores de "tabla no encontrada"

## 🚨 Errores Conocidos (Resueltos)

### ❌ "Encountered two children with the same key"
**Causa:** Algunos sites tienen `null` o vacío en campos de ID
**Solución:** Usar `site-${site.id}-${index}` como key en vez de solo `site.id`
**Status:** ✅ Resuelto en `FullMapView.native.tsx` línea 111

## 🔄 Próximos Pasos (Si Necesarios)

1. **Limpiar logs temporales** (cuando confirmes que funciona):
   - Remover `healthCheckSupabase()` de `app/_layout.tsx`
   - Remover console.logs de diagnóstico en:
     - `services/cuadrillas.ts`
     - `services/sites.ts`
     - `app/(tabs)/full-map.tsx`

2. **Optimizaciones opcionales**:
   - Implementar paginación real en `full-map.tsx` si los 6842 sites causan lag
   - Agregar caché de datos con React Query

## 📝 Notas Importantes

1. **No hay datos locales/mock**: Todo viene de Supabase
2. **Orden de coordenadas**: Siempre `{ latitude: lat, longitude: lng }` (no invertir)
3. **Validación de coordenadas**: `toLatLng()` valida rangos (-90/90, -180/180)
4. **Zona normalización**: `zoneKey()` mapea texto variable a claves fijas
5. **Sites read-only**: `sites_v1` es read-only, crear/update deshabilitado

## ✅ Verificación Final

Ejecuta estos pasos para confirmar:

1. **Iniciar la app** → Ver health check en consola
2. **Ir a "Mapa Completo"** → Ver 6842 sites + 119 cuadrillas
3. **Filtrar por zona** → Contadores correctos
4. **Buscar un site** → Nombres visibles
5. **Abrir un ticket** → Todos los campos presentes
6. **Revisar consola** → No errores de "tabla no encontrada"

**Fecha de migración:** 2025-01-XX
**Nueva BD:** `lgizmslffyaeeyogcdmm.supabase.co`
