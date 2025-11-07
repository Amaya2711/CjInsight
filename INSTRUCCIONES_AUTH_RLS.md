# Instrucciones: Autenticación con Supabase Auth + RLS

## 📋 Resumen

El sistema ahora usa **Supabase Auth** (email/password) en lugar de validación manual de usuario/clave. Las políticas RLS garantizan que cada usuario solo acceda a sus propios datos y a la cuadrilla asociada.

---

## 🔧 Paso 1: Ejecutar el script SQL de RLS

**Archivo:** `SUPABASE_RLS_SETUP.sql`

1. Ve al **SQL Editor** de Supabase
2. Copia y pega el contenido de `SUPABASE_RLS_SETUP.sql`
3. Ejecuta el script
4. **Espera 10-20 segundos** para que Supabase recargue el schema

Este script:
- ✅ Activa RLS en `usuario` y `cuadrillas`
- ✅ Crea políticas para que cada usuario solo vea/edite su propia fila
- ✅ Permite actualizar latitud/longitud de su cuadrilla
- ✅ Recarga el schema automáticamente

---

## 👤 Paso 2: Crear usuarios en Supabase Auth

Para cada usuario que quieras crear:

### 2.1. Crear usuario en Auth

En el **Authentication** panel de Supabase:

```
Email: usuario1@example.com
Password: password123
```

O usa el SQL:

```sql
-- Esto devuelve el UUID del usuario creado
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'usuario1@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  ''
) RETURNING id;
```

**Nota:** Guarda el `id` (UUID) que se devuelve.

### 2.2. Crear perfil en tabla usuario

```sql
-- Reemplaza los valores según corresponda:
-- - id_usuario: UUID del usuario de auth.users
-- - nombre_usuario: nombre para mostrar
-- - id: ID de la cuadrilla (de tabla cuadrillas)
-- - tipo_usuario: "oficina" o "campo"

INSERT INTO public.usuario (id_usuario, nombre_usuario, clave_usuario, tipo_usuario, id, activo)
VALUES (
  'aquí-va-el-uuid-del-auth-users',  -- UUID del paso 2.1
  'Juan Pérez',                       -- Nombre a mostrar
  NULL,                               -- Ya no se usa clave_usuario
  'campo',                            -- "campo" o "oficina"
  1,                                  -- ID de la cuadrilla
  TRUE
);
```

### 2.3. Verificar que la cuadrilla existe

```sql
SELECT id, nombre, zona, categoria, latitud, longitud
FROM public.cuadrillas
WHERE id = 1;  -- El ID que usaste en el paso 2.2
```

Si no existe, créala:

```sql
INSERT INTO public.cuadrillas (nombre, zona, categoria, latitud, longitud)
VALUES ('Cuadrilla 1', 'Lima Norte', 'REGULAR', NULL, NULL)
RETURNING id;
```

---

## 🧪 Paso 3: Probar el login en la app

1. Abre la app en tu dispositivo o emulador
2. En la pantalla de login, ingresa:
   - **Email:** `usuario1@example.com`
   - **Contraseña:** `password123`
3. Presiona "Ingresar"

### Logs esperados:

```
[AUTH] ==================================
[AUTH] Iniciando login con email: usuario1@example.com
[AUTH] ✅ Autenticación exitosa. UID: xxx-xxx-xxx
[AUTH] ✅ Perfil encontrado: { nombre: 'Juan Pérez', tipo: 'campo', cuadrillaId: 1 }
[AUTH] ✅ Cuadrilla asociada: Cuadrilla 1
[AUTH] Usuario guardado en AsyncStorage
[AUTH] ==================================
[authStore] SignIn exitoso: Juan Pérez
[authStore] Cuadrilla: Cuadrilla 1
[authStore] Usuario sincronizado con useAppStore
```

---

## 📊 Paso 4: Verificar RLS

### 4.1. Verificar que solo veo mi usuario

Desde la app (con el usuario logueado), intenta leer la tabla `usuario`:

```typescript
const { data, error } = await supabase
  .from('usuario')
  .select('*');

console.log('Usuarios visibles:', data);
// Debe mostrar solo TU usuario, no todos
```

### 4.2. Verificar que solo veo mi cuadrilla

```typescript
const { data, error } = await supabase
  .from('cuadrillas')
  .select('*');

console.log('Cuadrillas visibles:', data);
// Debe mostrar solo TU cuadrilla
```

---

## 🚀 Paso 5: Actualizar ubicación de la cuadrilla

Cuando el usuario presione "Iniciar seguimiento", la app debe actualizar la ubicación de su cuadrilla:

```typescript
import * as Location from 'expo-location';
import { supabase } from '@/utils/supabase';
import { useAuthStore } from '@/store/authStore';

async function iniciarSeguimiento() {
  const { user } = useAuthStore.getState();
  
  if (!user) {
    console.error('No hay usuario logueado');
    return;
  }

  // Obtener permisos de ubicación
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    console.error('Permisos de ubicación denegados');
    return;
  }

  // Obtener ubicación actual
  const location = await Location.getCurrentPositionAsync({});
  
  // Actualizar en Supabase
  const { error } = await supabase
    .from('cuadrillas')
    .update({
      latitud: location.coords.latitude,
      longitud: location.coords.longitude,
    })
    .eq('id', user.id);  // user.id es el ID de la cuadrilla

  if (error) {
    console.error('Error actualizando ubicación:', error);
  } else {
    console.log('✅ Ubicación actualizada:', {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
    });
  }
}
```

---

## 🔍 Solución de problemas

### Error: "No se encontró perfil de usuario"

**Causa:** El usuario existe en `auth.users` pero no en `public.usuario`.

**Solución:** Ejecuta el paso 2.2 para crear el perfil.

---

### Error: "column usuario.xxx does not exist"

**Causa:** Estás intentando leer un campo que no existe en la tabla.

**Solución:** Verifica la estructura de tu tabla:

```sql
\d public.usuario
```

---

### Error: "La tabla public.usuario no está visible"

**Causa:** RLS está activado pero no hay políticas, o el schema no se recargó.

**Solución:**
1. Ejecuta `NOTIFY pgrst, 'reload schema';` en SQL Editor
2. Espera 10-20 segundos
3. Vuelve a intentar

---

### No puedo actualizar latitud/longitud

**Causa:** La política RLS no permite UPDATE.

**Solución:** Asegúrate de haber ejecutado el script `SUPABASE_RLS_SETUP.sql` completo.

---

## 📝 Estructura de tablas

### public.usuario

| Campo           | Tipo    | Descripción                                    |
|-----------------|---------|------------------------------------------------|
| id_usuario      | UUID    | UUID de auth.users (PRIMARY KEY)               |
| nombre_usuario  | TEXT    | Nombre a mostrar                               |
| clave_usuario   | TEXT    | ⚠️ Ya no se usa (usar Supabase Auth)           |
| tipo_usuario    | TEXT    | "oficina" o "campo"                            |
| id              | INTEGER | ID de la cuadrilla asociada                    |
| activo          | BOOLEAN | Si el usuario está activo                      |

### public.cuadrillas

| Campo      | Tipo         | Descripción                        |
|------------|--------------|------------------------------------|
| id         | INTEGER      | PRIMARY KEY                        |
| nombre     | TEXT         | Nombre de la cuadrilla             |
| zona       | TEXT         | Zona de trabajo                    |
| categoria  | TEXT         | Categoría (REGULAR, CHOQUE, etc.)  |
| latitud    | NUMERIC      | Última latitud reportada           |
| longitud   | NUMERIC      | Última longitud reportada          |

---

## ✅ Checklist final

- [ ] Script SQL de RLS ejecutado
- [ ] Usuario creado en Supabase Auth
- [ ] Perfil creado en tabla `usuario`
- [ ] Cuadrilla asociada existe en tabla `cuadrillas`
- [ ] Login funciona desde la app
- [ ] Solo veo mi usuario y mi cuadrilla (RLS verificado)
- [ ] Puedo actualizar latitud/longitud de mi cuadrilla

---

## 🎯 Próximos pasos

1. **Implementar seguimiento continuo de ubicación**
   - Usar `Location.watchPositionAsync` en lugar de `getCurrentPositionAsync`
   - Actualizar cada X segundos/metros

2. **Implementar background location**
   - Usar `expo-location` con background permissions
   - Considerar `expo-task-manager` para actualizaciones en segundo plano

3. **Manejo de errores y reconexión**
   - Guardar ubicaciones offline si no hay conexión
   - Sincronizar cuando vuelva la conexión
