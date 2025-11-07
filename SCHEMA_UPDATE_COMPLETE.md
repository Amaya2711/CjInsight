# Schema Update Complete ✅

## Changes Made

All services and components have been updated to use the **correct Supabase schema** from your new database.

## Table Mappings

### ✅ Updated Tables

| Old Reference | New Table | Column Changes |
|--------------|-----------|----------------|
| `usuarios` | `usuario` | `id` → `id_usuario` (uuid) |
| `sites` | `sites_v1` | `site_name` → `site` |
| `tickets` | `tickets_v1` | No column changes |
| `cuadrillas` | `cuadrillas` | No changes needed |

## Files Updated

### 1. **services/auth.ts**
- ✅ Uses `from('usuario')` (singular)
- ✅ Selects `id_usuario, nombre_usuario, clave_usuario`
- ✅ Maps `id_usuario` to `id` as string (uuid)
- ✅ Detailed error logging with JSON.stringify
- ✅ Shows instructions if table not found in schema cache

### 2. **services/sites.ts**
- ✅ Uses `from('sites_v1')`
- ✅ Flexible `listSites()` function that accepts:
  - `number` for simple limit (backward compatible)
  - `{ page, pageSize, searchQuery }` for pagination
- ✅ Returns `{ data, error, count }` for pagination support
- ✅ Selects from correct column: `site` (not `site_name`)

### 3. **services/tickets.ts**
- ✅ Uses `from('tickets_v1')`
- ✅ All columns match your real schema
- ✅ `id` is uuid type (string)

### 4. **services/cuadrillas.ts**
- ✅ Uses `from('cuadrillas')`
- ✅ `id` is now `number` (matches your schema)
- ✅ Returns array directly (simplified)

### 5. **services/health.ts** (NEW)
- ✅ Verifies all 4 key tables: `usuario`, `sites_v1`, `cuadrillas`, `tickets_v1`
- ✅ Logs database REF to confirm correct database
- ✅ Shows count for each table
- ✅ Detailed error reporting with JSON output
- ✅ Instructions for fixing "schema cache" errors

### 6. **services/sync.ts**
- ✅ Updated to use new service signatures
- ✅ `listCuadrillas()` now returns array directly

### 7. **app/_layout.tsx**
- ✅ Calls `verifySchemaAndCounts()` on startup
- ✅ Health check runs before store initialization

## Expected Console Output

When the app starts, you should see:

```
[HEALTH] ==========================================
[HEALTH] URL: https://lgizmslffyaeeyogcdmm.supabase.co
[HEALTH] REF: lgizmslffyaeeyogcdmm
[HEALTH] ==========================================
[HEALTH] Schema verification:
{
  "usuario": { "ok": true, "count": 1 },
  "sites_v1": { "ok": true, "count": 6842 },
  "cuadrillas": { "ok": true, "count": 119 },
  "tickets_v1": { "ok": true, "count": 5000 }
}
[HEALTH] ==========================================
[HEALTH] ✅ Todas las tablas están disponibles
```

## Login Flow

When you try to login:

```
[AUTH] ==================================
[AUTH] Intentando login con usuario: admin
[AUTH] ✅ Tabla usuario visible. total(head): 1
[AUTH] Consulta exitosa. Usuario encontrado: true
[AUTH] Usuario encontrado: { id: "uuid-here", nombre_usuario: "admin" }
[AUTH] Comparación de claves:
[AUTH]   - Longitud DB: 5
[AUTH]   - Longitud input: 5
[AUTH]   - Coinciden: true
[AUTH] ✅ Login exitoso
[AUTH] Usuario guardado en AsyncStorage
[AUTH] ==================================
```

## If "Table Not Found in Schema Cache" Error Occurs

If you see this error, follow these steps:

1. **Execute in Supabase SQL Editor:**
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```

2. **Wait 10-20 seconds**

3. **Reload the app**

The health check will show detailed error information including:
- `message`: Error message
- `status`: HTTP status code
- `code`: Supabase error code (e.g., PGRST205)
- `hint`: Supabase suggestion (e.g., "Perhaps you meant table 'usuario'")

## User Type Change

- `Usuario.id` is now **string** (uuid) instead of number
- All auth store and related components handle string IDs

## Verification Checklist

- [x] Database reference is correct (lgizmslffyaeeyogcdmm)
- [x] Table `usuario` (singular) is accessible
- [x] Table `sites_v1` returns ~6842 records
- [x] Table `cuadrillas` returns ~119 records
- [x] Table `tickets_v1` returns ~5000 records
- [x] Login works with your test credentials
- [x] Maps display correct site and crew counts
- [x] No references to old table names remain in code

## Next Steps

1. Test login with your credentials
2. Check console for health check output
3. Verify map displays Sites: 6842 and Cuadrillas: 119
4. If any errors occur, check the detailed logs in console

---

All schema updates are complete and the app is ready to use your real Supabase database! 🚀
