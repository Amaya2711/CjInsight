# 🔍 INSTRUCCIONES PARA VALIDAR LA CONEXIÓN A SUPABASE

## Paso 1: Validación desde la Aplicación

1. **Abrir la aplicación** en tu dispositivo o navegador
2. **Navegar a la pestaña "Sincronización"** (Sync)
3. **Presionar el botón "Diagnóstico"**
4. **Revisar el resultado**:
   - ✅ Si aparece "Conexión exitosa" → La conexión está funcionando correctamente
   - ⚠️ Si aparece "Problemas de conexión" → Continúa con el Paso 2

## Paso 2: Revisar la Consola

Si el diagnóstico muestra problemas, abre la consola del navegador o del dispositivo:

### En el navegador (Web):
1. Presiona `F12` o `Ctrl+Shift+I` (Windows/Linux) o `Cmd+Option+I` (Mac)
2. Ve a la pestaña "Console"
3. Busca mensajes que comiencen con `[HEALTH]`

### En dispositivo móvil:
1. Usa Expo Go y revisa los logs en la terminal donde ejecutaste `npm start`
2. O usa React Native Debugger

## Paso 3: Verificar en Supabase

### 3.1 Verificar la estructura de las tablas

1. **Ir a Supabase Dashboard**: https://app.supabase.com
2. **Seleccionar tu proyecto**: `lgizmslffyaeeyogcdmm`
3. **Ir a SQL Editor**
4. **Ejecutar el script**: `SUPABASE_VALIDATION_SCRIPT.sql`

### 3.2 Campos que deben existir en cada tabla

#### Tabla `usuario`:
- `id_usuario` (integer, primary key)
- `nombre_usuario` (text)
- `clave_usuario` (text)
- `activo` (boolean)

#### Tabla `cuadrillas`:
- `id` (integer, primary key)
- `nombre` (text)
- `latitud` (numeric o double precision)
- `longitud` (numeric o double precision)
- `usuario_id` (integer, foreign key → usuario.id_usuario)

#### Tabla `sites_v1`:
- `id` (integer, primary key)
- Otros campos según tu estructura

#### Tabla `tickets_v1`:
- `id` (integer, primary key)
- Otros campos según tu estructura

## Paso 4: Verificar Políticas RLS

Las tablas deben tener Row Level Security (RLS) habilitado con políticas que permitan lectura:

```sql
-- Para tabla usuario
ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anonymous read" ON public.usuario;
CREATE POLICY "Allow anonymous read" ON public.usuario FOR SELECT USING (true);

-- Para tabla cuadrillas
ALTER TABLE public.cuadrillas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anonymous read" ON public.cuadrillas;
CREATE POLICY "Allow anonymous read" ON public.cuadrillas FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anonymous update" ON public.cuadrillas;
CREATE POLICY "Allow anonymous update" ON public.cuadrillas FOR UPDATE USING (true);

-- Para tabla sites_v1
ALTER TABLE public.sites_v1 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anonymous read" ON public.sites_v1;
CREATE POLICY "Allow anonymous read" ON public.sites_v1 FOR SELECT USING (true);

-- Para tabla tickets_v1
ALTER TABLE public.tickets_v1 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anonymous read" ON public.tickets_v1;
CREATE POLICY "Allow anonymous read" ON public.tickets_v1 FOR SELECT USING (true);
```

## Paso 5: Recargar el Schema

Después de hacer cualquier cambio en la estructura de la base de datos, **SIEMPRE** ejecuta:

```sql
NOTIFY pgrst, 'reload schema';
```

Luego **espera 10-20 segundos** antes de probar la conexión nuevamente.

## Paso 6: Verificar la URL y Anon Key

Verifica que la configuración en `utils/supabase.ts` sea correcta:

```typescript
const SUPABASE_URL = "https://lgizmslffyaeeyogcdmm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

Para obtener la URL y la Anon Key:
1. Ve a Supabase Dashboard
2. Ve a Settings → API
3. Copia la "Project URL" y la "anon public" key

## Paso 7: Errores Comunes y Soluciones

### Error: "column usuario.xxx does not exist"
**Solución**: El campo no existe en la tabla o tiene un nombre diferente. Verifica la estructura con:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'usuario';
```

### Error: "table usuario not found" o "tabla no visible"
**Solución**: 
1. Verifica que la tabla existe en el schema `public`
2. Ejecuta `NOTIFY pgrst, 'reload schema';`
3. Espera 10-20 segundos

### Error: "new row violates row-level security policy"
**Solución**: Las políticas RLS están bloqueando el acceso. Verifica las políticas con:
```sql
SELECT * FROM pg_policies WHERE tablename = 'usuario';
```

### Error: "No se pudo conectar con Supabase"
**Solución**: 
1. Verifica tu conexión a internet
2. Verifica que la URL de Supabase sea correcta
3. Verifica que el proyecto de Supabase esté activo

## Paso 8: Probar Login

Una vez que el diagnóstico pase, prueba el login:

1. Ve a la pantalla de Login
2. Ingresa un usuario válido (ejemplo: `CQ_AL`)
3. Ingresa la clave correcta
4. Presiona "Iniciar sesión"

Revisa la consola para ver los logs de autenticación que comienzan con `[AUTH]`.

## Logs Esperados en una Conexión Exitosa

```
[HEALTH] 🔍 VALIDACIÓN DE CONEXIÓN A SUPABASE
[HEALTH] URL: https://lgizmslffyaeeyogcdmm.supabase.co
[HEALTH] REF: lgizmslffyaeeyogcdmm
[HEALTH] ✅ URL correcta

[HEALTH] 🔹 Verificando tabla USUARIO...
[HEALTH] ✅ Tabla USUARIO accesible (X registros)
[HEALTH] 📋 Campos verificados: id_usuario, nombre_usuario, clave_usuario, activo

[HEALTH] 🔹 Verificando tabla CUADRILLAS...
[HEALTH] ✅ Tabla CUADRILLAS accesible (X registros)

[HEALTH] 🔹 Verificando tabla SITES_V1...
[HEALTH] ✅ Tabla SITES_V1 accesible (X registros)

[HEALTH] 🔹 Verificando tabla TICKETS_V1...
[HEALTH] ✅ Tabla TICKETS_V1 accesible (X registros)

[HEALTH] 🔹 Verificando relación USUARIO <-> CUADRILLAS...
[HEALTH] ✅ Relación USUARIO <-> CUADRILLAS funcional

[HEALTH] 📊 RESUMEN DE VALIDACIÓN
[HEALTH] ✅ Todas las verificaciones pasaron correctamente
```

## Contacto de Soporte

Si después de seguir todos estos pasos aún tienes problemas, proporciona:
1. Los logs completos de la consola
2. Screenshots del error en la app
3. El resultado de ejecutar `SUPABASE_VALIDATION_SCRIPT.sql`
