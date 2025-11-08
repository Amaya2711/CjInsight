# ✅ Implementación Completa: Autenticación con Supabase Auth + RLS

## 📋 ¿Qué se implementó?

### Cambios principales:

1. **Autenticación con Supabase Auth** (email/password) en lugar de validación manual
2. **Políticas RLS (Row Level Security)** para seguridad a nivel de base de datos
3. **Flujo completo de login** que lee usuario y cuadrilla asociada
4. **Actualización de servicios y stores** para el nuevo flujo

---

## 🚀 Guía de Implementación (Paso a Paso)

### ✅ PASO 1: Configurar RLS en Supabase

**Archivo:** `SUPABASE_RLS_SETUP.sql`

1. Abre el **SQL Editor** en tu dashboard de Supabase
2. Copia todo el contenido de `SUPABASE_RLS_SETUP.sql`
3. Pega y ejecuta
4. **Espera 10-20 segundos** para que el schema se recargue

**Este script:**
- ✅ Activa RLS en tablas `usuario` y `cuadrillas`
- ✅ Crea políticas para que cada usuario solo vea su propia fila
- ✅ Permite leer y actualizar solo la cuadrilla asociada
- ✅ Recarga el schema automáticamente

---

### ✅ PASO 2: Crear usuarios de prueba

**Archivo:** `SUPABASE_CREATE_TEST_USERS.sql`

1. Abre el **SQL Editor** en Supabase
2. Copia todo el contenido de `SUPABASE_CREATE_TEST_USERS.sql`
3. Pega y ejecuta

**Este script crea:**
- ✅ 3 cuadrillas de prueba (Lima Norte, Lima Sur, Callao)
- ✅ 4 usuarios de prueba con perfiles completos
- ✅ Relaciones correctas entre usuario y cuadrilla

**Credenciales creadas:**

| Email | Password | Tipo | Cuadrilla |
|-------|----------|------|-----------|
| `juan.perez@example.com` | `password123` | campo | Cuadrilla Lima Norte |
| `maria.garcia@example.com` | `password123` | campo | Cuadrilla Lima Sur |
| `carlos.lopez@example.com` | `password123` | campo | Cuadrilla Callao |
| `admin@example.com` | `admin123` | oficina | ninguna |

---

### ✅ PASO 3: Verificar la configuración

**Archivo:** `SUPABASE_VALIDATION_COMPLETE.sql`

1. Abre el **SQL Editor** en Supabase
2. Copia todo el contenido de `SUPABASE_VALIDATION_COMPLETE.sql`
3. Pega y ejecuta

**Este script verifica:**
- ✅ Estructura de las tablas `usuario` y `cuadrillas`
- ✅ RLS está activado
- ✅ Políticas RLS están configuradas
- ✅ Usuarios de prueba existen
- ✅ Relaciones usuario-cuadrilla funcionan

**Resultados esperados:**
- Query 1-2: Debe mostrar las columnas de las tablas
- Query 3: `rowsecurity = TRUE` para ambas tablas
- Query 4: Debe listar 5 políticas (3 para usuario, 2 para cuadrillas)
- Query 5-6: Debe mostrar los usuarios y cuadrillas de prueba
- Query 7: Debe mostrar la relación correcta

---

### ✅ PASO 4: Probar el login en la app

1. Inicia la app en tu dispositivo/emulador
2. Deberías ver la pantalla de login con campos para **Email** y **Contraseña**
3. Ingresa:
   - **Email:** `juan.perez@example.com`
   - **Contraseña:** `password123`
4. Presiona **Ingresar**

**Logs esperados en la consola:**

```
[AUTH] ==================================
[AUTH] Iniciando login con email: juan.perez@example.com
[AUTH] ✅ Autenticación exitosa. UID: xxx-xxx-xxx
[AUTH] ✅ Perfil encontrado: { nombre: 'Juan Pérez', tipo: 'campo', cuadrillaId: 1 }
[AUTH] ✅ Cuadrilla asociada: Cuadrilla Lima Norte
[AUTH] Usuario guardado en AsyncStorage
[AUTH] ==================================
[authStore] SignIn exitoso: Juan Pérez
[authStore] Cuadrilla: Cuadrilla Lima Norte
[authStore] Usuario sincronizado con useAppStore
```

Si ves estos logs, **¡el login funciona correctamente!** ✅

---

## 📁 Archivos modificados/creados

### Archivos SQL (ejecutar en Supabase):
- ✅ `SUPABASE_RLS_SETUP.sql` - Configuración de RLS
- ✅ `SUPABASE_CREATE_TEST_USERS.sql` - Usuarios de prueba
- ✅ `SUPABASE_VALIDATION_COMPLETE.sql` - Validación

### Archivos TypeScript (código de la app):
- ✅ `services/auth.ts` - Servicio de autenticación actualizado
- ✅ `store/authStore.ts` - Store de auth actualizado
- ✅ `app/login.tsx` - Pantalla de login actualizada

### Documentación:
- ✅ `INSTRUCCIONES_AUTH_RLS.md` - Guía detallada
- ✅ `AUTH_RLS_IMPLEMENTACION_COMPLETA.md` - Este archivo

---

## 🔐 Cómo funciona el flujo de autenticación

### 1. Login (email/password)

```typescript
// En services/auth.ts
export async function loginConEmailPassword(email: string, password: string) {
  // 1. Autenticar con Supabase Auth
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  // 2. Obtener el UUID del usuario autenticado
  const uid = authData.user.id;
  
  // 3. Leer perfil desde tabla usuario
  const { data: perfilData } = await supabase
    .from('usuario')
    .select('id_usuario, nombre_usuario, tipo_usuario, id')
    .eq('id_usuario', uid)
    .single();
  
  // 4. Leer cuadrilla asociada
  const { data: cuadrillaData } = await supabase
    .from('cuadrillas')
    .select('id, nombre, zona, categoria, latitud, longitud')
    .eq('id', perfilData.id)
    .maybeSingle();
  
  // 5. Retornar usuario y cuadrilla
  return { usuario: {...}, cuadrilla: {...} };
}
```

### 2. RLS (Row Level Security)

Cada usuario solo puede:
- ✅ Ver su propia fila en `usuario` (donde `id_usuario = auth.uid()`)
- ✅ Ver la cuadrilla asociada (donde `usuario.id = cuadrillas.id`)
- ✅ Actualizar latitud/longitud de su cuadrilla

**Ejemplo de política:**

```sql
CREATE POLICY "usuario_select_self"
ON public.usuario FOR SELECT TO authenticated
USING (id_usuario = auth.uid());
```

Esto significa: "Un usuario autenticado puede hacer SELECT en `usuario` solo si `id_usuario` coincide con su propio UUID".

### 3. Estructura de datos

```
auth.users (Supabase Auth)
└── id (UUID)
    │
    └── public.usuario
        ├── id_usuario (UUID) = auth.users.id
        ├── nombre_usuario
        ├── tipo_usuario
        └── id (INTEGER) = cuadrilla_id
            │
            └── public.cuadrillas
                ├── id (INTEGER)
                ├── nombre
                ├── zona
                ├── latitud
                └── longitud
```

---

## 🎯 Próximos pasos

### 1. Implementar seguimiento de ubicación

**Archivo a modificar:** `services/backgroundLocation.ts`

```typescript
import * as Location from 'expo-location';
import { supabase } from '@/utils/supabase';
import { useAuthStore } from '@/store/authStore';

export async function iniciarSeguimientoUbicacion() {
  const { user } = useAuthStore.getState();
  
  if (!user) {
    throw new Error('No hay usuario logueado');
  }

  // Solicitar permisos
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permisos de ubicación denegados');
  }

  // Iniciar seguimiento
  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 10000, // Actualizar cada 10 segundos
      distanceInterval: 50, // O cada 50 metros
    },
    async (location) => {
      console.log('Nueva ubicación:', location.coords);
      
      // Actualizar en Supabase
      const { error } = await supabase
        .from('cuadrillas')
        .update({
          latitud: location.coords.latitude,
          longitud: location.coords.longitude,
        })
        .eq('id', user.id);
      
      if (error) {
        console.error('Error actualizando ubicación:', error);
      } else {
        console.log('✅ Ubicación actualizada');
      }
    }
  );

  return subscription;
}
```

### 2. Botón "Iniciar seguimiento" en la UI

```typescript
// En alguna pantalla de la app
import { iniciarSeguimientoUbicacion } from '@/services/backgroundLocation';

function MiPantalla() {
  const [tracking, setTracking] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);

  async function toggleTracking() {
    if (tracking) {
      // Detener seguimiento
      subscription?.remove();
      setSubscription(null);
      setTracking(false);
    } else {
      // Iniciar seguimiento
      const sub = await iniciarSeguimientoUbicacion();
      setSubscription(sub);
      setTracking(true);
    }
  }

  return (
    <Pressable onPress={toggleTracking}>
      <Text>{tracking ? 'Detener seguimiento' : 'Iniciar seguimiento'}</Text>
    </Pressable>
  );
}
```

### 3. Background location (opcional)

Para que funcione incluso cuando la app está en segundo plano:

```typescript
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

const LOCATION_TASK_NAME = 'background-location-task';

// Definir la tarea
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Error en background location:', error);
    return;
  }

  if (data) {
    const { locations } = data as any;
    const location = locations[0];
    
    // Actualizar en Supabase
    // (necesitas guardar el user.id en AsyncStorage para acceder aquí)
  }
});

// Iniciar background location
await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
  accuracy: Location.Accuracy.High,
  timeInterval: 30000, // Cada 30 segundos
  distanceInterval: 100, // O cada 100 metros
  foregroundService: {
    notificationTitle: 'Seguimiento de ubicación activo',
    notificationBody: 'Tu ubicación se está compartiendo',
  },
});
```

---

## ❓ Solución de problemas comunes

### 1. Error: "Credenciales incorrectas"

**Causa:** Email o password incorrectos.

**Solución:** Verifica que el usuario existe:

```sql
SELECT email FROM auth.users WHERE email = 'juan.perez@example.com';
```

---

### 2. Error: "No se encontró perfil de usuario"

**Causa:** El usuario existe en `auth.users` pero no en `public.usuario`.

**Solución:** Crea el perfil:

```sql
INSERT INTO public.usuario (id_usuario, nombre_usuario, tipo_usuario, id, activo)
VALUES (
  'UUID-del-usuario',
  'Nombre',
  'campo',
  1,  -- ID de cuadrilla
  TRUE
);
```

---

### 3. Error: "column usuario.xxx does not exist"

**Causa:** La tabla no tiene el campo que intentas leer.

**Solución:** Verifica la estructura:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'usuario';
```

---

### 4. No veo ningún dato (RLS lo bloquea)

**Causa:** RLS está activado pero no hay políticas.

**Solución:** Ejecuta `SUPABASE_RLS_SETUP.sql` de nuevo.

---

### 5. "La tabla public.usuario no está visible"

**Causa:** El schema no se recargó después de crear las políticas.

**Solución:**

```sql
NOTIFY pgrst, 'reload schema';
```

Espera 10-20 segundos y vuelve a intentar.

---

## ✅ Checklist de verificación

Antes de decir que todo funciona, verifica:

- [ ] Script `SUPABASE_RLS_SETUP.sql` ejecutado
- [ ] Script `SUPABASE_CREATE_TEST_USERS.sql` ejecutado
- [ ] Script `SUPABASE_VALIDATION_COMPLETE.sql` muestra datos correctos
- [ ] Login funciona desde la app
- [ ] Logs muestran "✅ Autenticación exitosa"
- [ ] Logs muestran "✅ Perfil encontrado"
- [ ] Logs muestran "✅ Cuadrilla asociada"
- [ ] Usuario guardado en AsyncStorage
- [ ] RLS funciona (solo veo mi usuario y mi cuadrilla)

---

## 📚 Recursos adicionales

- **Supabase Auth:** https://supabase.com/docs/guides/auth
- **Row Level Security:** https://supabase.com/docs/guides/auth/row-level-security
- **expo-location:** https://docs.expo.dev/versions/latest/sdk/location/
- **expo-task-manager:** https://docs.expo.dev/versions/latest/sdk/task-manager/

---

## 🎉 ¡Listo!

Si seguiste todos los pasos, ahora tienes:
- ✅ Autenticación segura con Supabase Auth
- ✅ RLS configurado correctamente
- ✅ Usuarios de prueba creados
- ✅ Login funcionando en la app
- ✅ Base para implementar seguimiento de ubicación

**Siguiente paso:** Implementar el botón "Iniciar seguimiento" que actualice la ubicación de la cuadrilla en tiempo real.
