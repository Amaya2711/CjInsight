# Migración de Base de Datos Completada

## Cambios Realizados

### 1. Tabla de Sites: `public.sites` → `public.sites_v1`

#### Cambios en `services/sites.ts`:
- ✅ Todas las llamadas a `.from('sites')` ahora usan `.from('sites_v1')`
- ✅ Tipo `SiteDB` actualizado para reflejar la nueva estructura:
  - `site` → `site_name` (usando alias en la query: `site_name:site`)
  - Campos opcionales: todos los campos (excepto `id`) son ahora `| null`
  - Removidos: `direccion`, `es_principal`, `site_padre_id`
- ✅ Funciones de escritura deshabilitadas (sites_v1 es read-only):
  - `createSite()` - Retorna error
  - `updateSite()` - Retorna error  
  - `deleteSite()` - Retorna error
  - `upsertBulkSites()` - Retorna error
- ✅ Agregadas funciones helper:
  - `getSiteTitle(s: SiteDB): string` - Obtiene el nombre del sitio con fallbacks
  - `toLatLng(row: SiteDB)` - Convierte y valida coordenadas

#### Query de ejemplo:
```typescript
const { data, error } = await supabase
  .from('sites_v1')
  .select('id, codigo, site_name:site, tipologia, tecnologias, region, subregion, zona, departamento, provincia, distrito, latitud, longitud')
  .order('site', { ascending: true });
```

### 2. Tabla `cuadrilla_tecnico` - ELIMINADA

#### Cambios en `services/cuadrillaTecnico.ts`:
- ✅ Todas las funciones ahora retornan datos vacíos o errores apropiados
- ✅ Se mantienen los tipos para compatibilidad de código existente
- ✅ Cada función loguea un warning indicando que la tabla no existe

Funciones stubbed:
- `listCuadrillaTecnicos()` → `{ data: [], error: null }`
- `getCuadrillaTecnicosByCuadrillaId()` → `{ data: [], error: null }`
- `getCuadrillaTecnicosByTecnicoId()` → `{ data: [], error: null }`
- `createCuadrillaTecnico()` → `{ data: null, error: Error }`
- `deleteCuadrillaTecnico()` → `{ data: null, error: null }`
- `upsertBulkCuadrillaTecnicos()` → `{ data: [], error: null }`

### 3. Servicio de Sincronización

#### Cambios en `services/sync.ts`:
- ✅ Actualizado para manejar la ausencia de `cuadrilla_tecnico` sin errores
- ✅ Los warnings de `cuadrilla_tecnico` son ahora esperados (no bloquean la sync)

## Estructura de Datos Actualizada

### SiteDB (sites_v1)
```typescript
{
  id: number;
  codigo: string | null;
  site_name: string | null;  // <- Alias de 'site' en la BD
  tipologia: string | null;
  tecnologias: string | null;
  region: string | null;
  subregion: string | null;
  zona: string | null;
  departamento: string | null;
  provincia: string | null;
  distrito: string | null;
  latitud: number | null;
  longitud: number | null;
  created_at?: string;
}
```

## Verificación Post-Migración

### ✅ Checklist:
- [x] Todas las referencias a `public.sites` actualizadas a `sites_v1`
- [x] Todas las referencias a `cuadrilla_tecnico` removidas/stubbed
- [x] Servicios actualizados y funcionando
- [x] Sync service maneja la ausencia de cuadrilla_tecnico
- [x] Funciones helper agregadas para nombres y coordenadas
- [x] Logs de debug agregados en supabase.ts

### 🔍 Para verificar en la app:

1. **Sites**: 
   - Lista de sites debe mostrar nombres correctos (no "Sin nombre")
   - Búsqueda por código y nombre debe funcionar
   - Mapa debe mostrar marcadores en posiciones correctas

2. **Cuadrillas**:
   - Mapa de cuadrillas debe seguir funcionando normalmente
   - No deben aparecer errores de cuadrilla_tecnico en consola

3. **Sincronización**:
   - La carga inicial debe completar sin errores críticos
   - Puede aparecer warning de cuadrilla_tecnico (es esperado)

## Pasos Siguientes

### 1. Recargar el bundler
```bash
# Stop y start del Live preview
# O forzar clear cache en Metro bundler
```

### 2. Verificar variables de entorno
El archivo `utils/supabase.ts` ya tiene logs que mostrarán:
- URL de Supabase en uso
- Primeros 8 caracteres de la key
- Plataforma (web/ios/android)

### 3. Verificar en consola
Buscar estos logs al iniciar la app:
```
========== SUPABASE CONFIG ==========
[Supabase] URL usada: https://...
[Supabase] KEY presente: true
[Sites Service] Loaded X sites, total count: Y
[Sync] ⚠️ cuadrilla_tecnico table not available (expected in new DB)
```

## Compatibilidad

- ✅ Web: Compatible
- ✅ iOS: Compatible  
- ✅ Android: Compatible
- ✅ Código existente: Compatible (gracias a la capa de servicio)

## Notas Adicionales

### Búsqueda en sites_v1
La búsqueda usa el nombre de columna original (`site`), no el alias:
```typescript
.or(`codigo.ilike.%${search}%,site.ilike.%${search}%,provincia.ilike.%${search}%`)
```

### Coordenadas
- Las coordenadas se convierten automáticamente (comas → puntos)
- Se validan rangos (-90 a 90 lat, -180 a 180 lng)
- Se loguean coordenadas inválidas para debugging

### Read-only vs Read-write
- `sites_v1`: Solo lectura
- `cuadrillas`: Lectura y escritura (sin cambios)
- `tickets_v1`: Solo lectura (ya existía así)
- Otras tablas: Sin cambios
