# Flujo de Seguimiento de Ubicación Implementado

## Resumen
El sistema implementa un flujo completo de autenticación y seguimiento de ubicación de cuadrillas en tiempo real. Al ingresar al sistema, el usuario se autentica contra la tabla USUARIO de Supabase, se guarda su información (incluyendo la cuadrilla asociada) en una variable global, y luego puede iniciar el seguimiento de ubicación que actualiza automáticamente las coordenadas de la cuadrilla en la base de datos.

---

## 1. Validación de Usuario (Login)

### Tabla en Supabase
- **Tabla:** `usuario`
- **Campos de autenticación:**
  - `nombre_usuario` → USUARIO-NOMBRE_USUARIO (campo de login)
  - `clave_usuario` → USUARIO-CLAVE_USUARIO (contraseña en texto plano)
  - `id` → USUARIO-ID (ID único del usuario)
  - `cuadrilla_id` → Identifica la cuadrilla asociada al usuario
  - `nombre_empleado` → Nombre completo del empleado (opcional)
  - `rol` → Rol del usuario en el sistema (opcional)

### Implementación
**Archivo:** `services/auth.ts` → función `loginConUsuarioClave()`

```typescript
// Busca el usuario por nombre_usuario y valida la clave
const { data, error } = await supabase
  .from("usuario")
  .select(`
    id,
    nombre_usuario,
    nombre_empleado,
    clave_usuario,
    rol,
    cuadrilla_id
  `)
  .eq("nombre_usuario", nombre_usuario)
  .maybeSingle();

// Valida la contraseña (texto plano)
if (claveDB !== claveInput) {
  throw new Error("Contraseña incorrecta");
}

// Crea el objeto Usuario
const u: Usuario = { 
  id: String(data.id), 
  nombre_usuario: data.nombre_usuario,
  nombre_empleado: data.nombre_empleado,
  rol: data.rol,
  userType: "oficina",
  cuadrilla_id: data.cuadrilla_id,
};

// Guarda en AsyncStorage (persistencia local)
await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(u));
```

**Pantalla de Login:** `app/login.tsx`
- Input de usuario
- Input de contraseña
- Botón "Ingresar" que llama a `signIn()` del store

---

## 2. Variable Global del Usuario

### Almacenamiento
El usuario autenticado se guarda en **dos lugares**:

#### a) AsyncStorage (Persistencia)
- **Key:** `"session_usuario"`
- **Función:** Mantener la sesión entre reinicios de la app
- **Ubicación:** `services/auth.ts`

#### b) Zustand Store (Estado de la aplicación)
- **Store:** `authStore.ts` → propiedad `user`
- **Tipo:** `Usuario` (definido en `services/auth.ts`)
- **Acceso global:** `useAuthStore()` hook disponible en toda la app

```typescript
// Cualquier componente puede acceder al usuario así:
const { user } = useAuthStore();

console.log(user.id);              // USUARIO-ID
console.log(user.nombre_usuario);  // Nombre de usuario
console.log(user.cuadrilla_id);    // ID de la cuadrilla asociada
```

### Sincronización con useAppStore
Cuando el usuario inicia sesión, también se sincroniza con el store principal:

**Archivo:** `store/authStore.ts`
```typescript
const appUser: User = {
  id: u.id,
  name: u.nombre_usuario,
  role: "admin",
  userType: u.userType,
  email: "",
  phone: null,
  zone: null,
  crewId: u.cuadrilla_id ? String(u.cuadrilla_id) : null,  // Cuadrilla asociada
  status: "active",
};
useAppStore.getState().setCurrentUser(appUser);
```

---

## 3. Identificación de la Cuadrilla

### Flujo
1. Usuario inicia sesión con sus credenciales
2. El sistema busca el registro en la tabla `usuario`
3. Lee el campo `cuadrilla_id` del usuario
4. Este ID identifica qué cuadrilla está asociada al usuario
5. Se guarda en la variable global `user.cuadrilla_id`

### Ejemplo
```
Usuario: CQ_AL
Contraseña: 123456
---
Resultado después del login:
user.id = "1"
user.nombre_usuario = "CQ_AL"
user.cuadrilla_id = 120  ← Este es el ID de la cuadrilla
```

---

## 4. Seguimiento de Ubicación ("Iniciar seguimiento")

### Pantalla de Control
**Archivo:** `app/(tabs)/profile.tsx`

La pantalla Profile muestra:
- Información del usuario autenticado
- **ID de Cuadrilla asignada** (automáticamente desde `user.cuadrilla_id`)
- Botón **"Iniciar seguimiento"** / **"Finalizar seguimiento"**
- Estado del seguimiento (activo, inactivo, errores)
- Coordenadas actuales (latitud/longitud)
- Última actualización

### Botón "Iniciar seguimiento"
Cuando el usuario presiona el botón:

**Archivo:** `app/(tabs)/profile.tsx` → función `handleStartTracking()`

```typescript
const handleStartTracking = async () => {
  // 1. Valida que no sea web (solo móvil)
  if (Platform.OS === 'web') {
    Alert.alert('No disponible en web');
    return;
  }

  // 2. Obtiene el ID de la cuadrilla del usuario
  const crewId = user.cuadrilla_id;
  
  // 3. Inicia el servicio de background location
  const result = await startBackgroundLocation(crewId);
  
  // 4. Actualiza el estado local
  setIsTrackingLocation(true);
};
```

### Servicio de Background Location
**Archivo:** `services/backgroundLocation.ts`

#### Función: `startBackgroundLocation(crewId: number)`

```typescript
export async function startBackgroundLocation(crewId: number) {
  // 1. Solicita permisos de ubicación
  const { status } = await Location.requestForegroundPermissionsAsync();
  
  // 2. Guarda el crewId en AsyncStorage
  await AsyncStorage.setItem(CREW_ID_KEY, crewId.toString());
  
  // 3. Configura el seguimiento de ubicación
  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.High,
    timeInterval: 5000,        // Actualiza cada 5 segundos
    distanceInterval: 0,       // Cualquier movimiento
    foregroundService: {
      notificationTitle: 'Seguimiento de ubicación',
      notificationBody: 'La app está rastreando tu ubicación',
    },
  });
}
```

---

## 5. Actualización Automática de Coordenadas

### Task Manager (Background Task)
El sistema usa `expo-task-manager` para ejecutar código incluso cuando la app está cerrada:

**Archivo:** `services/backgroundLocation.ts` → `TaskManager.defineTask()`

```typescript
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  // 1. Obtiene la nueva ubicación
  const { locations } = data;
  const location = locations[0];
  const { latitude, longitude } = location.coords;
  
  // 2. Lee el crewId guardado
  const crewIdStr = await AsyncStorage.getItem(CREW_ID_KEY);
  const crewId = parseInt(crewIdStr, 10);
  
  // 3. Actualiza en Supabase
  await updateCuadrilla(crewId, {
    latitud: latitude,
    longitud: longitude,
  });
  
  console.log(`✅ Ubicación actualizada para cuadrilla ${crewId}`);
  console.log(`   Latitud: ${latitude}`);
  console.log(`   Longitud: ${longitude}`);
});
```

### Actualización en Base de Datos
**Archivo:** `services/cuadrillas.ts` → función `updateCuadrilla()`

```typescript
export async function updateCuadrilla(id: number, updates: Partial<CuadrillaInsert>) {
  const { data, error } = await supabase
    .from('cuadrillas')
    .update(updates)  // { latitud: X, longitud: Y }
    .eq('id', id)     // WHERE id = crewId
    .select();
  
  return { data, error };
}
```

### Tabla en Supabase
- **Tabla:** `cuadrillas`
- **Campos actualizados:**
  - `latitud` → CUADRILLAS-LATITUD (se actualiza cada 5 segundos)
  - `longitud` → CUADRILLAS-LONGITUD (se actualiza cada 5 segundos)
- **Condición:** `WHERE id = cuadrilla_id` (del usuario autenticado)

---

## 6. Manejo de Conexión Offline

El sistema maneja situaciones sin conexión a internet:

### Ubicaciones Pendientes
Cuando no hay conexión:
1. Las ubicaciones se guardan localmente en AsyncStorage
2. Cuando vuelve la conexión, se sincronizan automáticamente
3. Se mantiene un registro de todas las ubicaciones fallidas

**Archivo:** `services/backgroundLocation.ts`

```typescript
// Si no hay conexión, guarda para después
if (!online) {
  await savePendingLocation({
    latitude,
    longitude,
    timestamp: Date.now(),
    crewId,
  });
  return;
}

// Cuando vuelve la conexión, sincroniza todo
await syncPendingLocations();
```

---

## 7. Flujo Completo (End-to-End)

### Paso 1: Usuario inicia sesión
```
Input: nombre_usuario = "CQ_AL", clave = "123456"
↓
SELECT * FROM usuario WHERE nombre_usuario = 'CQ_AL'
↓
Valida clave_usuario = "123456" ✓
↓
Lee cuadrilla_id = 120
↓
Guarda en AsyncStorage y Store global
```

### Paso 2: Usuario va a la pantalla Profile
```
Carga user desde useAuthStore()
↓
Muestra: ID de Cuadrilla = 120
↓
Usuario ve el botón "Iniciar seguimiento"
```

### Paso 3: Usuario presiona "Iniciar seguimiento"
```
Click en botón
↓
handleStartTracking() se ejecuta
↓
Valida permisos de ubicación
↓
Llama startBackgroundLocation(120)
↓
Guarda crewId=120 en AsyncStorage
↓
Inicia task de background con expo-task-manager
```

### Paso 4: Background task actualiza ubicación
```
Cada 5 segundos (timeInterval: 5000):
↓
Obtiene ubicación actual (lat/lng)
↓
Lee crewId=120 de AsyncStorage
↓
UPDATE cuadrillas 
SET latitud = X, longitud = Y 
WHERE id = 120
↓
✅ Coordenadas actualizadas en Supabase
```

---

## 8. Archivos Principales

| Archivo | Propósito |
|---------|-----------|
| `services/auth.ts` | Autenticación con tabla usuario |
| `store/authStore.ts` | Store global del usuario (Zustand) |
| `app/login.tsx` | Pantalla de login |
| `app/(tabs)/profile.tsx` | Pantalla con botón "Iniciar seguimiento" |
| `services/backgroundLocation.ts` | Servicio de seguimiento de ubicación |
| `services/cuadrillas.ts` | CRUD de tabla cuadrillas en Supabase |
| `utils/asyncStorageHelper.ts` | Helpers para AsyncStorage |

---

## 9. Variables Globales Disponibles

Desde cualquier componente puedes acceder a:

```typescript
import { useAuthStore } from '@/store/authStore';

const { user } = useAuthStore();

// Variables disponibles:
user.id              // USUARIO-ID
user.nombre_usuario  // USUARIO-NOMBRE_USUARIO
user.nombre_empleado // Nombre completo
user.clave_usuario   // (no se guarda en el store por seguridad)
user.rol             // Rol del usuario
user.cuadrilla_id    // CUADRILLAS-ID asociada ← IMPORTANTE
user.userType        // "oficina" | "campo"
```

---

## 10. Logs de Consola

El sistema genera logs detallados para debugging:

### Login
```
[AUTH] ==================================
[AUTH] Intentando login con usuario: CQ_AL
[AUTH] ✅ Tabla usuario visible. total(head): 10
[AUTH] Consulta exitosa. Usuario encontrado: true
[AUTH] Usuario encontrado: {
  id: 1,
  nombre_usuario: "CQ_AL",
  nombre_empleado: "Cuadrilla Lima Norte",
  rol: "tecnico",
  cuadrilla_id: 120
}
[AUTH] Comparación de claves:
[AUTH]   - Longitud DB: 6
[AUTH]   - Longitud input: 6
[AUTH]   - Coinciden: true
[AUTH] ✅ Login exitoso
[AUTH] Usuario guardado en AsyncStorage: {...}
[AUTH] ==================================
```

### Seguimiento de ubicación
```
[BackgroundLocation] 🚀 Iniciando seguimiento en background para crew: 120
[BackgroundLocation] ✅ Background location iniciado
[BackgroundLocation] ===== NUEVA UBICACIÓN RECIBIDA =====
[BackgroundLocation] Crew ID: 120
[BackgroundLocation] Latitud: -12.0463731
[BackgroundLocation] Longitud: -77.0427699
[BackgroundLocation] Precisión: 20 metros
[BackgroundLocation] ========================================
[BackgroundLocation] 🔄 Actualizando en Supabase...
[Cuadrillas] Actualizando cuadrilla: { id: 120, updates: { latitud: -12.0463731, longitud: -77.0427699 } }
[Cuadrillas] ✅ Cuadrilla actualizada: { id: 120, nombre: "CQ_AL", latitud: -12.0463731, longitud: -77.0427699 }
[BackgroundLocation] ✅ Ubicación actualizada en Supabase exitosamente
```

---

## 11. Pruebas

### Probar el login
1. Abre la app
2. Ingresa credenciales de la tabla `usuario`
3. Verifica en consola los logs de `[AUTH]`
4. Confirma que se guarda `cuadrilla_id`

### Probar el seguimiento
1. Ve a la pestaña "Profile"
2. Verifica que se muestra el "ID de Cuadrilla asignada"
3. Presiona "Iniciar seguimiento"
4. Observa los logs en consola cada 5 segundos
5. Verifica en Supabase que los campos `latitud` y `longitud` se actualizan

### Verificar en Supabase
```sql
-- Ver la cuadrilla y sus coordenadas actuales
SELECT id, nombre, latitud, longitud 
FROM cuadrillas 
WHERE id = 120;

-- Ver actualizaciones en tiempo real (refresh cada 5 segundos)
```

---

## Notas Importantes

1. **Contraseñas en texto plano:** El sistema actualmente usa contraseñas sin hash. Para producción, se recomienda usar bcrypt o similar.

2. **Background location en Expo Go:** El seguimiento en segundo plano NO funciona en Expo Go. Requiere un development build o build de producción.

3. **Permisos iOS:** Para iOS, necesitas configurar `NSLocationAlwaysAndWhenInUseUsageDescription` en `app.json`.

4. **Intervalo de actualización:** Configurado a 5 segundos (`timeInterval: 5000`). Ajustar según necesidades de batería vs. precisión.

5. **Manejo de errores:** El sistema maneja automáticamente errores de red y reintenta cuando vuelve la conexión.

---

## Resumen Visual

```
┌─────────────────────────────────────────────────────────────────┐
│                         LOGIN                                    │
│  Usuario ingresa: nombre_usuario + clave_usuario                │
│  ↓                                                               │
│  Se busca en tabla USUARIO                                       │
│  ↓                                                               │
│  Se valida la contraseña                                         │
│  ↓                                                               │
│  Se lee USUARIO-ID y CUADRILLA-ID                               │
│  ↓                                                               │
│  Se guarda en variable global (AsyncStorage + Store)            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    PANTALLA PROFILE                              │
│  Muestra: ID de Cuadrilla = [user.cuadrilla_id]                │
│  Botón: "Iniciar seguimiento"                                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓ (Usuario hace click)
┌─────────────────────────────────────────────────────────────────┐
│              SERVICIO DE BACKGROUND LOCATION                     │
│  1. Solicita permisos de ubicación                              │
│  2. Guarda crewId en AsyncStorage                               │
│  3. Inicia background task (cada 5 segundos)                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓ (Cada 5 segundos)
┌─────────────────────────────────────────────────────────────────┐
│                   ACTUALIZACIÓN EN SUPABASE                      │
│  UPDATE cuadrillas                                              │
│  SET latitud = X, longitud = Y                                  │
│  WHERE id = [user.cuadrilla_id]                                 │
│  ↓                                                               │
│  ✅ Coordenadas actualizadas en tiempo real                     │
└─────────────────────────────────────────────────────────────────┘
```

---

¡El sistema está completamente implementado y funcional! 🎉
