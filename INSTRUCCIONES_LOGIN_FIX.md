# 🔧 Solución al Error de Login

## ❌ Error Actual
```
Could not find the table 'public.usuarios' in the schema cache
```

## ✅ Solución

### PASO 1: Crear la Tabla de Usuarios en Supabase

1. Abre **[Supabase Dashboard](https://app.supabase.com)**
2. Selecciona tu proyecto: **lgizmslffyaeeyogcdmm**
3. Ve a **SQL Editor** (menú izquierdo)
4. Crea una nueva query
5. Copia y pega **TODO** el contenido del archivo `SUPABASE_CREATE_USUARIOS.sql`
6. Haz clic en **RUN** (o presiona Ctrl/Cmd + Enter)

### PASO 2: Verificar que se Creó Correctamente

En el mismo SQL Editor, ejecuta:

```sql
SELECT id, nombre_usuario, rol, activo, created_at 
FROM public.usuarios 
ORDER BY id;
```

**Resultado esperado:** Deberías ver 3 usuarios:
- admin (contraseña: admin123)
- tecnico1 (contraseña: tecnico123)
- supervisor1 (contraseña: super123)

### PASO 3: Probar el Login en la App

1. Reinicia la app (cierra y vuelve a abrir)
2. En la pantalla de login, usa:
   - **Usuario:** `admin`
   - **Contraseña:** `admin123`
3. Haz clic en **Ingresar**

✅ **Resultado esperado:** Deberías poder iniciar sesión y ver la pantalla principal.

## 📋 Usuarios de Prueba Creados

| Usuario      | Contraseña   | Rol            |
|-------------|--------------|----------------|
| admin       | admin123     | administrador  |
| tecnico1    | tecnico123   | tecnico        |
| supervisor1 | super123     | supervisor     |

## 🔐 Importante: Seguridad

⚠️ **Las contraseñas están en texto plano solo para desarrollo/testing**

En producción deberás:
1. Cambiar todas las contraseñas
2. Implementar hash de contraseñas (bcrypt)
3. Endurecer las políticas RLS para que no sean accesibles por usuarios anónimos

## 🐛 Si Persiste el Error

Verifica que:
1. ✅ El script se ejecutó sin errores
2. ✅ La tabla `usuarios` aparece en la lista de tablas de Supabase
3. ✅ Los 3 usuarios están insertados
4. ✅ La app está usando la URL correcta: `https://lgizmslffyaeeyogcdmm.supabase.co`

## 📝 Verificación en la App

Revisa la consola de la app. Deberías ver:

```
[HEALTH] URL: https://lgizmslffyaeeyogcdmm.supabase.co
[HEALTH] usuarios: 3 null
[AUTH] Intentando login con usuario: admin
[AUTH] ✅ Login exitoso
```

Si ves errores, copia y pega el mensaje completo del error.
