# AUTH: Diagnóstico Mejorado y Pre-Chequeo de Tabla

## ✅ Cambios Implementados

### 1. Nueva función `assertUsuariosTable()`
- Pre-chequea que la tabla `public.usuarios` esté visible en el esquema del API
- Ejecuta un query HEAD antes de intentar login
- Si falla, muestra diagnóstico detallado con todos los campos del error:
  - `message`
  - `details`
  - `hint`
  - `code`
  - `status`

### 2. Instrucciones Dev en consola
Cuando la tabla no es visible (schema cache), muestra:

```
╔═══════════════════════════════════════════════════════════════════════
║ [DEV] El API no ve la tabla public.usuarios (caché de esquema).
║ 
║ SOLUCIONES POSIBLES:
║ 
║ 1) En Supabase > SQL Editor, ejecuta:
║    NOTIFY pgrst, 'reload schema';
║    -- esperar 10-20 segundos y volver a intentar login
║ 
║ 2) Verifica que la tabla esté en schema 'public' y no en otro.
║ 
║ 3) Verifica que 'usuarios' no es una VIEW en otro schema.
║ 
║ 4) Reinicia el Preview/Live para limpiar caché de cliente.
╚═══════════════════════════════════════════════════════════════════════
```

### 3. Mejores mensajes de error
- Ya no muestra `[object Object]`
- Todos los errores muestran el objeto completo con sus propiedades
- Logs estructurados con prefijo `[AUTH]`

### 4. HealthCheck en inicio
Ya estaba implementado en:
- `app/_layout.tsx` → ejecuta `healthCheckSupabase()`
- `app/index.tsx` → también ejecuta `healthCheckSupabase()`

El healthCheck verifica:
- REF de la BD (debe ser `lgizmslffyaeeyogcdmm`)
- Conteo de `usuarios` table
- Muestra sample de usuarios disponibles

### 5. Logs mejorados en AuthStore
- Logs en hydrate, signIn, signOut
- Captura errores y los muestra estructuradamente
- No oculta errores con loading state

## 🔍 Verificación de Criterios

### ✓ Confirmar nueva BD
En consola debe aparecer:
```
[HEALTH] REF: lgizmslffyaeeyogcdmm
[HEALTH] usuarios: <count> <error>
```

### ✓ Pre-chequeo de tabla
Antes de login, ejecuta `assertUsuariosTable()`:
```
[AUTH] ✅ usuarios visible. total (head): <count>
```

### ✓ Login con admin/admin
Debe funcionar si existe en la tabla con esas credenciales.

### ✓ Errores detallados
Si falla, muestra:
- message
- details
- hint
- code
- status

NO muestra `[object Object]`.

## 📝 Próximos Pasos (Manual)

Si persiste el error de schema cache:
1. Ir a Supabase SQL Editor
2. Ejecutar: `NOTIFY pgrst, 'reload schema';`
3. Esperar 10-20 segundos
4. Intentar login nuevamente

## 🗃️ Archivos Modificados

- `services/auth.ts` → añadida función `assertUsuariosTable()`, mejores logs
- `store/authStore.ts` → logs mejorados, mejor manejo de errores
- `AUTH_DIAGNOSTICO_MEJORADO.md` → este documento

## 🎯 Sin Referencias a Tablas Viejas

- ✅ No hay referencias a `users`
- ✅ No hay referencias a `usuarios_v1`
- ✅ Solo usa `public.usuarios`
