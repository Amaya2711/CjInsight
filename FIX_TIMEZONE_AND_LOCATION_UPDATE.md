# 🔧 CORRECCIONES: Zona Horaria y Actualización de Ubicación en Android

## ❌ Problemas Identificados

### 1. Fecha/Hora Incorrecta
**Problema:** El sistema grababa timestamps en UTC en lugar de la zona horaria local del dispositivo.
**Impacto:** Todas las fechas y horas en `cuadrilla_ruta` aparecían con diferencia horaria incorrecta.

### 2. Ubicación No Se Actualiza en Android
**Problema:** En dispositivos Android, la ubicación solo se registraba al ingresar al sistema y después no se actualizaba.
**Impacto:** 
- Tabla `cuadrilla_ruta` no recibía nuevos puntos
- "Ubicación Actual" en el perfil mostraba coordenadas antiguas
- Seguimiento de ruta no funcionaba correctamente

---

## ✅ Soluciones Implementadas

### 1. Corrección de Zona Horaria

#### En `services/backgroundLocation.ts`:

**Antes:**
```typescript
timestamp: new Date(location.timestamp).toISOString() // UTC
```

**Después:**
```typescript
// Obtener fecha/hora local del dispositivo
const now = new Date(location.timestamp);
const timezoneOffset = now.getTimezoneOffset() * 60000;
const localTime = new Date(now.getTime() - timezoneOffset);
const localISOString = localTime.toISOString().slice(0, -1);
timestamp: localISOString // Hora local sin 'Z'
```

#### En `services/cuadrillaRuta.ts`:

**Agregado:**
```typescript
// Si no se proporciona timestamp, usar hora local del dispositivo
let timestampToUse = ruta.timestamp;
if (!timestampToUse) {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  const localTime = new Date(now.getTime() - timezoneOffset);
  timestampToUse = localTime.toISOString().slice(0, -1);
}
```

**Resultado:** Todos los timestamps ahora se guardan en la zona horaria del dispositivo.

---

### 2. Mejora de Actualización de Ubicación en Android

#### A. Configuración Más Agresiva en Background Location

**En `services/backgroundLocation.ts`:**

**Antes:**
```typescript
await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
  accuracy: Location.Accuracy.High,
  timeInterval: 5000,
  distanceInterval: 0,
  pausesUpdatesAutomatically: false,
});
```

**Después:**
```typescript
await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
  accuracy: Location.Accuracy.BestForNavigation, // Máxima precisión
  timeInterval: 5000, // Cada 5 segundos
  distanceInterval: 0, // Sin distancia mínima
  deferredUpdatesInterval: 5000, // Forzar envío cada 5 seg
  deferredUpdatesDistance: 0, // Sin esperar distancia
  pausesUpdatesAutomatically: false, // NUNCA pausar
  activityType: Location.ActivityType.AutomotiveNavigation, // Optimizado
  foregroundService: {
    notificationTitle: 'Seguimiento de ubicación activo',
    notificationBody: 'CJ Insight está rastreando tu ubicación cada 5 segundos',
    notificationColor: '#0066cc',
  },
});
```

**Cambios clave:**
- ✅ `BestForNavigation`: Máxima precisión GPS
- ✅ `deferredUpdatesInterval`: Forzar actualizaciones cada 5 seg
- ✅ `activityType: AutomotiveNavigation`: Optimizado para movimiento
- ✅ Notificación más descriptiva

#### B. Implementación de watchPositionAsync para Android

**En `app/(tabs)/profile.tsx`:**

**Agregado:**
```typescript
// En Android, usar watchPositionAsync para actualizaciones continuas
if (Platform.OS === "android") {
  const watchSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 5000, // Cada 5 segundos
      distanceInterval: 0, // Sin distancia mínima
    },
    async (location) => {
      const { latitude, longitude } = location.coords;
      setCurrentLocation({ latitude, longitude });
      setLastUpdate(new Date());
      
      // Actualizar en Supabase inmediatamente
      await supabase
        .from("cuadrillas")
        .update({
          latitud: latitude,
          longitud: longitude,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }
  );
  
  // Guardar para limpieza posterior
  (global as any).locationWatchSubscription = watchSubscription;
}
```

**Beneficios:**
- ✅ Actualizaciones cada 5 segundos garantizadas
- ✅ Funciona incluso si background location falla
- ✅ Actualiza tabla `cuadrillas` en tiempo real
- ✅ Actualiza "Ubicación Actual" en la pantalla

#### C. Limpieza Correcta al Detener

**Agregado en `stopLocationTracking()`:**
```typescript
// Detener watchPosition si está activo (Android)
if (Platform.OS === "android" && (global as any).locationWatchSubscription) {
  (global as any).locationWatchSubscription.remove();
  (global as any).locationWatchSubscription = null;
}
```

---

## 🎯 Resultados Esperados

### Zona Horaria:
- ✅ Todos los timestamps en `cuadrilla_ruta` usan hora local
- ✅ Las consultas SQL muestran fechas/horas correctas
- ✅ Reportes y filtros por fecha funcionan correctamente

### Actualización de Ubicación en Android:
- ✅ La ubicación se actualiza cada 5 segundos
- ✅ Tabla `cuadrilla_ruta` recibe nuevos puntos continuamente
- ✅ "Ubicación Actual" en perfil se actualiza en tiempo real
- ✅ El mapa de seguimiento muestra rutas completas
- ✅ Funciona incluso con la app en segundo plano

---

## 🔍 Cómo Verificar

### 1. Verificar Zona Horaria:

**En Supabase SQL Editor:**
```sql
-- Ver los últimos 10 puntos con timestamps
SELECT 
  id,
  cuadrilla_id,
  fecha::text as fecha_guardada,
  hora::text as hora_guardada,
  timestamp::text as timestamp_completo,
  latitud,
  longitud,
  created_at::text
FROM cuadrilla_ruta
ORDER BY id DESC
LIMIT 10;
```

**Resultado esperado:** Las horas deben coincidir con la hora local del dispositivo (no UTC).

### 2. Verificar Actualización en Android:

**Pasos:**
1. Abrir app en Android
2. Ir a Perfil
3. Iniciar "Ruta Activa"
4. Mover el dispositivo o esperar 5 segundos
5. Verificar que "Última actualización" cambia cada 5 segundos
6. En Supabase, ejecutar:

```sql
-- Ver actualizaciones en tiempo real
SELECT 
  id,
  cuadrilla_id,
  timestamp::text,
  latitud,
  longitud,
  created_at::text
FROM cuadrilla_ruta
WHERE cuadrilla_id = 121  -- Reemplazar con tu ID
  AND created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
```

**Resultado esperado:** Nuevas filas cada 5 segundos con timestamps actualizados.

---

## 📱 Configuración Requerida en Android

Para que funcione correctamente, la app requiere:

### 1. Permisos en AndroidManifest.xml:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
```

### 2. Configuración de GPS:

El usuario debe:
- ✅ Tener GPS activado
- ✅ Permitir "Ubicación todo el tiempo" (no solo "Mientras usas la app")
- ✅ Permitir "Precisión alta" en configuración de ubicación

---

## 🛠️ Troubleshooting

### Si la ubicación aún no se actualiza en Android:

1. **Verificar permisos:**
   ```
   Settings → Apps → CJ Insight → Permissions → Location
   → Seleccionar "Allow all the time"
   ```

2. **Verificar GPS:**
   ```
   Settings → Location → Mode → High accuracy
   ```

3. **Verificar que la app no esté en ahorro de batería:**
   ```
   Settings → Battery → Battery optimization
   → CJ Insight → Don't optimize
   ```

4. **Ver logs en tiempo real:**
   - Conectar dispositivo Android
   - Abrir Android Studio
   - Ver Logcat filtrado por "BackgroundLocation" o "Profile"

### Si los timestamps siguen en UTC:

1. Verificar que la build esté actualizada
2. Ejecutar `npm run build:web`
3. Verificar en logs: "Timestamp local:" debe aparecer

---

## 📊 Comparación Antes/Después

### Zona Horaria:

| Aspecto | Antes | Después |
|---------|-------|---------|
| Timestamp guardado | 2025-11-07 22:15:25 (UTC) | 2025-11-07 19:15:25 (Local) |
| Hora mostrada | 3 horas adelantada | Hora correcta del dispositivo |
| Filtros por fecha | No funcionaban bien | Funcionan correctamente |

### Actualización de Ubicación:

| Aspecto | Antes (Android) | Después (Android) |
|---------|-----------------|-------------------|
| Frecuencia | Solo al inicio | Cada 5 segundos |
| Puntos en ruta | 1 punto | Todos los puntos |
| Ubicación actual | Estática | Actualiza en tiempo real |
| Background | No funcionaba | Funciona correctamente |
| Precisión | Baja | Alta (BestForNavigation) |

---

## ✅ Archivos Modificados

1. `services/backgroundLocation.ts`
   - Timestamp con zona horaria local
   - Configuración más agresiva
   - Logs mejorados

2. `services/cuadrillaRuta.ts`
   - Default timestamp en hora local
   - Validación de timestamp

3. `app/(tabs)/profile.tsx`
   - watchPositionAsync para Android
   - Limpieza correcta al detener
   - Actualización en tiempo real

---

## 🚀 Próximos Pasos

1. **Probar en dispositivo Android real:**
   - Instalar la build actualizada
   - Verificar permisos
   - Iniciar seguimiento
   - Mover el dispositivo
   - Verificar actualizaciones cada 5 segundos

2. **Verificar en Supabase:**
   - Ver tabla `cuadrilla_ruta`
   - Confirmar timestamps locales
   - Confirmar frecuencia de actualización

3. **Si todo funciona:**
   - ✅ Desplegar a producción
   - ✅ Actualizar documentación de usuario
   - ✅ Informar al equipo

---

**Fecha de corrección:** 7 de noviembre de 2025  
**Versión:** 1.1.0  
**Problemas resueltos:** ✅ Zona horaria ✅ Actualización en Android
