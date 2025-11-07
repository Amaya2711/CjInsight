# Sistema de Seguimiento de Ubicación - Documentación Completa

## Resumen

El sistema almacena una **variable global** con el `USUARIO-ID` (que corresponde al ID de la cuadrilla) al momento del login, y utiliza este valor para actualizar automáticamente los campos `CUADRILLAS-LATITUD` y `CUADRILLAS-LONGITUD` en la base de datos según la ubicación GPS del dispositivo.

---

## 1. Variable Global - USUARIO-ID (ID de Cuadrilla)

### Tabla: PUBLIC.USUARIO

Según la estructura de la base de datos en Supabase, la tabla `USUARIO` tiene el siguiente campo crítico:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | bigint (int8) | **Id Cuadrilla** - Este campo almacena el ID de la cuadrilla asociada al usuario |

### Almacenamiento en la Aplicación

**Archivo:** `services/auth.ts` (líneas 5-12, 90-97)

```typescript
export type Usuario = {
  id_usuario: string;         // UUID del usuario (id_usuario)
  nombre_usuario: string;     // Nombre de usuario para login
  tipo_usuario: string | null;// CAMPO u OFICINA
  id: number | null;          // ID de la cuadrilla asociada (campo USUARIO-ID en BD)
  id_empleado: string | null; // UUID del empleado
  cuadrilla_id?: number | null; // Alias para id (compatibilidad)
};
```

**Cuándo se almacena:**

1. **Login** - Función `loginConUsuarioClave()` (línea 29-103):
   - Lee el campo `id` de la tabla `USUARIO`
   - Lo almacena en el objeto `Usuario`
   - Lo guarda en `AsyncStorage` para persistencia

2. **Carga de sesión** - Función `getUsuarioGuardado()` (línea 112-114):
   - Recupera el usuario desde `AsyncStorage`
   - Restaura la variable global `id` (ID de cuadrilla)

**Archivo:** `store/authStore.ts` (líneas 20-50, 51-79)

El store global `useAuthStore` mantiene:
- `user.id` - Variable global con el ID de la cuadrilla del usuario
- `user.cuadrilla_id` - Alias del mismo valor

### Logs de verificación

Al hacer login, verás estos logs en consola:

```
[AUTH] ✅ Variable global USUARIO-ID (ID Cuadrilla): 123
[authStore] ✅ Variable global almacenada - USUARIO-ID (ID Cuadrilla): 123
```

---

## 2. Botón "Iniciar Seguimiento"

### Ubicación en la Aplicación

**Archivo:** `app/(tabs)/profile.tsx` (líneas 285-296)

El botón se encuentra en la pantalla de perfil y **NO solicita el ID de cuadrilla manualmente** porque:
1. Ya está almacenado en la variable global `user.id`
2. Se obtiene automáticamente del usuario autenticado

### Código del Botón

```typescript
<TouchableOpacity
  style={[
    styles.locationButton,
    isTrackingLocation && styles.locationButtonActive,
  ]}
  onPress={isTrackingLocation ? handleStopTracking : handleStartTracking}
>
  <MapPin size={20} color="#FFFFFF" />
  <Text style={styles.locationButtonText}>
    {isTrackingLocation ? 'Finalizar seguimiento' : 'Iniciar seguimiento'}
  </Text>
</TouchableOpacity>
```

### Flujo al Presionar el Botón

**Función:** `handleStartTracking()` (líneas 30-88)

1. Verifica que el usuario tenga una cuadrilla asignada (`user.cuadrilla_id`)
2. Convierte el ID a número: `parseInt(user.cuadrilla_id.toString(), 10)`
3. Llama a `startBackgroundLocation(crewIdNum)`
4. Inicia el servicio de seguimiento en segundo plano

---

## 3. Actualización de CUADRILLAS-LATITUD y CUADRILLAS-LONGITUD

### Servicio de Background Location

**Archivo:** `services/backgroundLocation.ts`

#### 3.1 Almacenamiento del ID de Cuadrilla

**Función:** `startBackgroundLocation(crewId: number)` (líneas 202-277)

```typescript
// Guarda el crewId (USUARIO-ID) en AsyncStorage
await AsyncStorage.setItem(CREW_ID_KEY, crewId.toString());
```

La clave `CREW_ID_KEY` = `'tracking-crew-id'` (línea 10)

#### 3.2 Task Manager - Actualización Automática

**Función:** `TaskManager.defineTask(LOCATION_TASK_NAME, ...)` (líneas 99-196)

**Cada 5 segundos** (configurado en línea 248), el sistema:

1. **Lee el ID de cuadrilla almacenado:**
   ```typescript
   const crewIdStr = await AsyncStorage.getItem(CREW_ID_KEY);
   const crewId = parseInt(crewIdStr, 10);
   ```

2. **Obtiene la ubicación GPS actual:**
   ```typescript
   const { latitude, longitude, accuracy, altitude, heading, speed } = location.coords;
   ```

3. **Actualiza la tabla CUADRILLAS en Supabase:**
   ```typescript
   const result = await updateCuadrilla(crewId, {
     latitud: latitude,
     longitud: longitude,
   });
   ```

#### 3.3 Logs de Actualización

**Consola durante el seguimiento:**

```
[BackgroundLocation] ===== NUEVA UBICACIÓN RECIBIDA =====
[BackgroundLocation] ✅ CUADRILLAS-ID (USUARIO-ID): 123
[BackgroundLocation] 📍 CUADRILLAS-LATITUD: -12.046374
[BackgroundLocation] 📍 CUADRILLAS-LONGITUD: -77.042793
[BackgroundLocation] Precisión: 15 metros
[BackgroundLocation] ========================================
[BackgroundLocation] 🔄 Actualizando en Supabase...
[BackgroundLocation] ✅ Datos actualizados en CUADRILLAS: {
  'CUADRILLAS-ID': 123,
  'CUADRILLAS-NOMBRE': 'Cuadrilla A',
  'CUADRILLAS-LATITUD': -12.046374,
  'CUADRILLAS-LONGITUD': -77.042793
}
[BackgroundLocation] ✅ Ubicación actualizada en Supabase exitosamente
```

---

## 4. Servicio updateCuadrilla

**Archivo:** `services/cuadrillas.ts`

```typescript
export async function updateCuadrilla(id: number, data: Partial<Cuadrilla>) {
  return await supabase
    .from('cuadrillas')
    .update(data)
    .eq('id', id)  // Busca por CUADRILLAS-ID (igual a USUARIO-ID)
    .select()
    .single();
}
```

**Operación SQL equivalente:**

```sql
UPDATE public.cuadrillas
SET latitud = :latitude, longitud = :longitude
WHERE id = :crewId;
```

---

## 5. Funcionalidades Adicionales

### 5.1 Modo Sin Conexión

Si el dispositivo pierde conexión a internet:
- Las ubicaciones se guardan localmente en `AsyncStorage`
- Cuando vuelve la conexión, se sincronizan automáticamente
- Ver función `syncPendingLocations()` (líneas 51-97)

### 5.2 Configuración del Seguimiento

**Precisión:** Alta (`Location.Accuracy.High`)  
**Intervalo:** 5 segundos (`timeInterval: 5000`)  
**Distancia mínima:** 0 metros (detecta cualquier movimiento)

### 5.3 Seguimiento en Segundo Plano

- Funciona incluso cuando la app está cerrada
- Requiere permisos de ubicación en segundo plano
- Muestra notificación en Android: "Seguimiento de ubicación"

---

## 6. Flujo Completo del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. LOGIN                                                        │
│    - Usuario ingresa nombre_usuario y clave_usuario            │
│    - Sistema consulta PUBLIC.USUARIO                           │
│    - Obtiene USUARIO-ID (campo 'id' = ID de cuadrilla)       │
│    - Guarda en variable global: user.id                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. INICIAR SEGUIMIENTO (Botón en perfil)                      │
│    - Lee user.id (ID de cuadrilla)                            │
│    - Llama startBackgroundLocation(user.id)                   │
│    - Guarda user.id en AsyncStorage (key: 'tracking-crew-id') │
│    - Inicia Task Manager para seguimiento GPS                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. ACTUALIZACIÓN AUTOMÁTICA (Cada 5 segundos)                 │
│    - Task Manager lee 'tracking-crew-id' de AsyncStorage      │
│    - Obtiene ubicación GPS actual (lat, lng)                  │
│    - Ejecuta UPDATE en PUBLIC.CUADRILLAS                      │
│      WHERE id = tracking-crew-id                              │
│      SET latitud = lat, longitud = lng                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. BASE DE DATOS ACTUALIZADA                                  │
│    - CUADRILLAS-ID: 123 (igual a USUARIO-ID)                 │
│    - CUADRILLAS-LATITUD: -12.046374                          │
│    - CUADRILLAS-LONGITUD: -77.042793                         │
│    - Timestamp automático (updated_at)                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Verificación del Sistema

### Paso 1: Login
1. Inicia sesión en la app
2. Verifica en consola: `[authStore] ✅ Variable global almacenada - USUARIO-ID (ID Cuadrilla): X`

### Paso 2: Ir a Perfil
1. Navega a la pestaña "Perfil"
2. Verifica que se muestre: "Cuadrilla asignada: ID X"

### Paso 3: Iniciar Seguimiento
1. Presiona "Iniciar seguimiento"
2. Acepta los permisos de ubicación
3. Observa los logs en consola

### Paso 4: Verificar Actualizaciones
1. Abre Supabase SQL Editor
2. Ejecuta:
   ```sql
   SELECT id, nombre, latitud, longitud, updated_at 
   FROM public.cuadrillas 
   WHERE id = X;  -- Reemplaza X con tu USUARIO-ID
   ```
3. Verifica que `latitud` y `longitud` se actualizan cada 5 segundos

---

## 8. Archivos Clave del Sistema

| Archivo | Responsabilidad |
|---------|-----------------|
| `services/auth.ts` | Login, almacenamiento de USUARIO-ID |
| `store/authStore.ts` | Variable global del usuario y cuadrilla |
| `services/backgroundLocation.ts` | Seguimiento GPS y actualización en BD |
| `services/cuadrillas.ts` | Operaciones CRUD de tabla CUADRILLAS |
| `app/(tabs)/profile.tsx` | UI del botón "Iniciar seguimiento" |

---

## 9. Campos de Base de Datos

### Tabla: PUBLIC.USUARIO
- `id_usuario` (uuid) - UUID único del usuario
- `nombre_usuario` (varchar) - Username para login
- `clave_usuario` (varchar) - Contraseña encriptada
- `tipo_usuario` (text) - "CAMPO" u "OFICINA"
- **`id` (bigint)** - **ID de la cuadrilla (USUARIO-ID)**

### Tabla: PUBLIC.CUADRILLAS
- **`id` (bigint)** - **ID de la cuadrilla (igual a USUARIO-ID)**
- `nombre` (varchar) - Nombre de la cuadrilla
- **`latitud` (numeric)** - **CUADRILLAS-LATITUD (actualizado automáticamente)**
- **`longitud` (numeric)** - **CUADRILLAS-LONGITUD (actualizado automáticamente)**
- `zona` (varchar) - Zona asignada
- `categoria` (varchar) - Categoría de la cuadrilla

---

## Estado: ✅ IMPLEMENTADO Y FUNCIONANDO

Todos los componentes del sistema están implementados y probados:
- ✅ Variable global USUARIO-ID almacenada en login
- ✅ Botón "Iniciar seguimiento" sin solicitar ID manual
- ✅ Actualización automática de CUADRILLAS-LATITUD y CUADRILLAS-LONGITUD
- ✅ Búsqueda automática por CUADRILLAS-ID = USUARIO-ID
- ✅ Logs detallados para debugging
- ✅ Manejo de errores y modo sin conexión
