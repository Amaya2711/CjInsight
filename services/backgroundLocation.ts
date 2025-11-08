import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { updateCuadrilla } from './cuadrillas';
import { insertCuadrillaRuta } from './cuadrillaRuta';
import { errorToString } from '@/utils/formatSupabaseError';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { timestampToPeruTime } from '@/utils/timezone';

const LOCATION_TASK_NAME = 'background-location-task';
const CREW_ID_KEY = 'tracking-crew-id';
const PENDING_LOCATIONS_KEY = 'pending-locations';

type PendingLocation = {
  latitude: number;
  longitude: number;
  timestamp: number;
  crewId: number;
};

async function savePendingLocation(location: PendingLocation): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(PENDING_LOCATIONS_KEY);
    const pending: PendingLocation[] = existing ? JSON.parse(existing) : [];
    pending.push(location);
    await AsyncStorage.setItem(PENDING_LOCATIONS_KEY, JSON.stringify(pending));
    console.log('[BackgroundLocation] 💾 Ubicación guardada para enviar después');
  } catch (error) {
    console.error('[BackgroundLocation] Error guardando ubicación pendiente:', error);
  }
}

async function getPendingLocations(): Promise<PendingLocation[]> {
  try {
    const existing = await AsyncStorage.getItem(PENDING_LOCATIONS_KEY);
    return existing ? JSON.parse(existing) : [];
  } catch (error) {
    console.error('[BackgroundLocation] Error obteniendo ubicaciones pendientes:', error);
    return [];
  }
}

async function clearPendingLocations(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_LOCATIONS_KEY);
    console.log('[BackgroundLocation] 🗑️  Ubicaciones pendientes limpiadas');
  } catch (error) {
    console.error('[BackgroundLocation] Error limpiando ubicaciones pendientes:', error);
  }
}

async function syncPendingLocations(): Promise<void> {
  const pending = await getPendingLocations();
  if (pending.length === 0) return;

  console.log(`[BackgroundLocation] 🔄 Sincronizando ${pending.length} ubicaciones pendientes...`);
  
  const netState = await NetInfo.fetch();
  const online = !!(netState.isConnected && netState.isInternetReachable !== false);
  
  if (!online) {
    console.log('[BackgroundLocation] 📴 Sin conexión, manteniendo ubicaciones pendientes');
    return;
  }

  let successCount = 0;
  const remaining: PendingLocation[] = [];

  for (const location of pending) {
    try {
      const result = await updateCuadrilla(location.crewId, {
        latitud: location.latitude,
        longitud: location.longitude,
      });

      if (result.error) {
        console.error('[BackgroundLocation] Error sincronizando ubicación:', errorToString(result.error));
        remaining.push(location);
      } else {
        successCount++;
      }
    } catch (error) {
      console.error('[BackgroundLocation] Excepción sincronizando ubicación:', error);
      remaining.push(location);
    }
  }

  if (remaining.length > 0) {
    await AsyncStorage.setItem(PENDING_LOCATIONS_KEY, JSON.stringify(remaining));
    console.log(`[BackgroundLocation] ⚠️  ${remaining.length} ubicaciones pendientes quedaron sin sincronizar`);
  } else {
    await clearPendingLocations();
  }

  if (successCount > 0) {
    console.log(`[BackgroundLocation] ✅ ${successCount} ubicaciones sincronizadas exitosamente`);
  }
}

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[BackgroundLocation] ❌ Error en background task:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const crewIdStr = await AsyncStorage.getItem(CREW_ID_KEY);
    
    if (!crewIdStr) {
      console.error('[BackgroundLocation] ⚠️  No hay crew ID configurado');
      return;
    }

    const crewId = parseInt(crewIdStr, 10);
    if (isNaN(crewId)) {
      console.error('[BackgroundLocation] ⚠️  Crew ID inválido:', crewIdStr);
      return;
    }

    console.log(`[BackgroundLocation] 📍 Ubicación recibida en background (${locations.length} puntos)`);

    const location = locations[0];
    const { latitude, longitude, accuracy, altitude, heading, speed } = location.coords;

    console.log('[BackgroundLocation] ╔════════════════════════════════════════════╗');
    console.log('[BackgroundLocation] ║  NUEVA UBICACIÓN RECIBIDA                  ║');
    console.log('[BackgroundLocation] ╚════════════════════════════════════════════╝');
    console.log('[BackgroundLocation] 🔑 Crew ID (de AsyncStorage):', crewIdStr);
    console.log('[BackgroundLocation] 🔑 Crew ID (parseado):', crewId);
    console.log('[BackgroundLocation] 🎯 SE VA A ACTUALIZAR LA FILA CON ID =', crewId, 'EN TABLA CUADRILLAS');
    console.log('[BackgroundLocation] 📍 NUEVA CUADRILLAS.LATITUD =', latitude);
    console.log('[BackgroundLocation] 📍 NUEVA CUADRILLAS.LONGITUD =', longitude);
    console.log('[BackgroundLocation] 📏 Precisión:', accuracy, 'metros');
    console.log('[BackgroundLocation] 🏔️  Altitud:', altitude);
    console.log('[BackgroundLocation] 🧭 Dirección:', heading);
    console.log('[BackgroundLocation] 🚗 Velocidad:', speed, 'm/s');
    console.log('[BackgroundLocation] ⏰ Timestamp:', new Date(location.timestamp).toISOString());
    console.log('[BackgroundLocation] ╚════════════════════════════════════════════╝');

    await syncPendingLocations();

    const netState = await NetInfo.fetch();
    const online = !!(netState.isConnected && netState.isInternetReachable !== false);

    if (!online) {
      console.log('[BackgroundLocation] 📴 Sin conexión, guardando ubicación');
      await savePendingLocation({
        latitude,
        longitude,
        timestamp: Date.now(),
        crewId,
      });
      return;
    }

    try {
      console.log('[BackgroundLocation] ╔════════════════════════════════════════════╗');
      console.log('[BackgroundLocation] ║  ENVIANDO A SUPABASE                       ║');
      console.log('[BackgroundLocation] ╚════════════════════════════════════════════╝');
      console.log('[BackgroundLocation] 🎯 EJECUTANDO UPDATE EN TABLA: cuadrillas');
      console.log('[BackgroundLocation] 🎯 WHERE id =', crewId, '(tipo:', typeof crewId, ')');
      console.log('[BackgroundLocation] 🎯 SET latitud =', latitude);
      console.log('[BackgroundLocation] 🎯 SET longitud =', longitude);
      console.log('[BackgroundLocation] ');
      console.log('[BackgroundLocation] 📝 SQL equivalente:');
      console.log('[BackgroundLocation]    UPDATE cuadrillas');
      console.log('[BackgroundLocation]    SET latitud =', latitude, ', longitud =', longitude);
      console.log('[BackgroundLocation]    WHERE id =', crewId, ';');
      
      const result = await updateCuadrilla(crewId, {
        latitud: latitude,
        longitud: longitude,
      });

      if (result.error) {
        console.error('[BackgroundLocation] ❌ Error en respuesta de Supabase:');
        console.error('[BackgroundLocation] Error object:', JSON.stringify(result.error, null, 2));
        console.error('[BackgroundLocation] Error details:', result.error);
        throw new Error(errorToString(result.error));
      }

      if (!result.data) {
        console.error('[BackgroundLocation] ╔════════════════════════════════════════════╗');
        console.error('[BackgroundLocation] ║  ⚠️  ADVERTENCIA: SIN DATOS DE RETORNO    ║');
        console.error('[BackgroundLocation] ╚════════════════════════════════════════════╝');
        console.error('[BackgroundLocation] La actualización se completó sin error, pero no devolvió datos.');
        console.error('[BackgroundLocation] ');
        console.error('[BackgroundLocation] 🔴 POSIBLES CAUSAS:');
        console.error('[BackgroundLocation]   1. RLS (Row Level Security) está BLOQUEANDO el UPDATE');
        console.error('[BackgroundLocation]   2. No existe registro con ID =', crewId);
        console.error('[BackgroundLocation]   3. Permisos insuficientes en Supabase');
        console.error('[BackgroundLocation] ');
        console.error('[BackgroundLocation] 🔧 SOLUCIÓN:');
        console.error('[BackgroundLocation]   Ve a Supabase SQL Editor y ejecuta:');
        console.error('[BackgroundLocation]   ALTER TABLE public.cuadrillas DISABLE ROW LEVEL SECURITY;');
        console.error('[BackgroundLocation] ');
        console.error('[BackgroundLocation] 📄 Lee el archivo: INSTRUCCIONES_URGENTE.md');
        console.error('[BackgroundLocation] ╚════════════════════════════════════════════╝');
      } else {
        console.log('[BackgroundLocation] ╔════════════════════════════════════════════╗');
        console.log('[BackgroundLocation] ║  ✅ ACTUALIZACIÓN EXITOSA                 ║');
        console.log('[BackgroundLocation] ╚════════════════════════════════════════════╝');
        console.log('[BackgroundLocation] 🎯 Fila actualizada en tabla CUADRILLAS:');
        console.log('[BackgroundLocation]   - ID:', result.data.id);
        console.log('[BackgroundLocation]   - NOMBRE:', result.data.nombre);
        console.log('[BackgroundLocation]   - LATITUD:', result.data.latitud);
        console.log('[BackgroundLocation]   - LONGITUD:', result.data.longitud);
        console.log('[BackgroundLocation] ╚════════════════════════════════════════════╝');

        console.log('[BackgroundLocation] 🛣️  Registrando punto en CUADRILLA_RUTA...');
        
        // Obtener fecha/hora local del dispositivo (Perú UTC-5)
        const now = new Date(location.timestamp);
        const localISOString = timestampToPeruTime(location.timestamp);
        
        console.log('[BackgroundLocation] ⏰ Timestamp original (UTC):', now.toISOString());
        console.log('[BackgroundLocation] 🌍 Timezone: America/Lima (UTC-5)');
        console.log('[BackgroundLocation] ⏰ Timestamp local (Perú):', localISOString);
        
        const rutaResult = await insertCuadrillaRuta({
          cuadrilla_id: crewId,
          latitud: latitude,
          longitud: longitude,
          timestamp: localISOString, // Usar timestamp local
          accuracy: accuracy || null,
          altitude: altitude || null,
          heading: heading || null,
          speed: speed || null,
        });

        if (rutaResult.error) {
          console.error('[BackgroundLocation] ⚠️  Error registrando punto en CUADRILLA_RUTA:', errorToString(rutaResult.error));
        } else {
          console.log('[BackgroundLocation] ✅ Punto registrado en CUADRILLA_RUTA (ID:', rutaResult.data?.id, ')');
        }
      }

      console.log('[BackgroundLocation] ✅ Ubicación actualizada en Supabase exitosamente');
    } catch (error: any) {
      const errorMsg = errorToString(error);
      const isNetworkError = errorMsg.includes('Network') || 
                            errorMsg.includes('fetch failed') || 
                            errorMsg.includes('Cannot coerce');

      if (isNetworkError) {
        console.log('[BackgroundLocation] 📴 Error de red, guardando para después');
        await savePendingLocation({
          latitude,
          longitude,
          timestamp: Date.now(),
          crewId,
        });
      } else {
        console.error('[BackgroundLocation] ❌ Error actualizando ubicación:', errorMsg);
      }
    }
  }
});

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

export async function startBackgroundLocation(crewId: number): Promise<{ success: boolean; error?: string; usingForeground?: boolean }> {
  try {
    console.log('[BackgroundLocation] 🚀 ================================');
    console.log('[BackgroundLocation] 🚀 INICIANDO SEGUIMIENTO DE UBICACIÓN');
    console.log('[BackgroundLocation] 🎯 CUADRILLA ID RECIBIDO:', crewId);
    console.log('[BackgroundLocation] 🚀 ================================');

    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      return { success: false, error: 'Permiso de ubicación en primer plano denegado' };
    }

    await AsyncStorage.setItem(CREW_ID_KEY, crewId.toString());
    console.log('[BackgroundLocation] 💾 ID guardado en AsyncStorage:', crewId.toString());
    console.log('[BackgroundLocation] 💾 Key usada:', CREW_ID_KEY);

    if (isExpoGo()) {
      console.log('[BackgroundLocation] ⚠️  Ejecutando en Expo Go - Background location no disponible');
      console.log('[BackgroundLocation] 💡 Se requiere un development build para usar background location');
      console.log('[BackgroundLocation] 📱 Usando modo foreground solamente');
      return { 
        success: true, 
        usingForeground: true,
        error: 'Background location requiere development build. Usando modo foreground.'
      };
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.log('[BackgroundLocation] ⚠️  Permiso de background denegado, usando foreground');
      return { 
        success: true, 
        usingForeground: true,
        error: 'Permiso de ubicación en segundo plano denegado. Usando modo foreground.'
      };
    }

    const isTaskDefined = await TaskManager.isTaskDefined(LOCATION_TASK_NAME);
    if (!isTaskDefined) {
      console.error('[BackgroundLocation] ❌ Task no está definida');
      return { success: false, error: 'Background task no está registrada' };
    }

    try {
      console.log('[BackgroundLocation] 📍 Configurando seguimiento...');
      console.log('[BackgroundLocation] - Precisión: Máxima (BestForNavigation)');
      console.log('[BackgroundLocation] - Intervalo de tiempo: 5 segundos');
      console.log('[BackgroundLocation] - Distancia mínima: 0 metros (cualquier movimiento)');
      console.log('[BackgroundLocation] - Actualizaciones NO pausan automáticamente');
      console.log('[BackgroundLocation] - Servicio foreground activo (Android)');
      
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.BestForNavigation, // Máxima precisión
        timeInterval: 5000, // Cada 5 segundos
        distanceInterval: 0, // Sin importar distancia mínima
        deferredUpdatesInterval: 5000, // Enviar actualizaciones cada 5 seg
        deferredUpdatesDistance: 0, // Sin esperar distancia mínima
        foregroundService: {
          notificationTitle: 'Seguimiento de ubicación activo',
          notificationBody: 'CJ Insight está rastreando tu ubicación cada 5 segundos',
          notificationColor: '#0066cc',
        },
        pausesUpdatesAutomatically: false, // NUNCA pausar automáticamente
        showsBackgroundLocationIndicator: true, // Mostrar indicador en iOS
        activityType: Location.ActivityType.AutomotiveNavigation, // Optimizado para navegación
      });

      console.log('[BackgroundLocation] ✅ Background location iniciado');
      return { success: true };
    } catch (bgError: any) {
      const errorMsg = errorToString(bgError);
      if (errorMsg.includes('UIBackgroundModes') || errorMsg.includes('not been configured')) {
        console.log('[BackgroundLocation] ⚠️  Background location no configurado, usando foreground');
        return { 
          success: true, 
          usingForeground: true,
          error: 'Background location no disponible. Usando modo foreground.'
        };
      }
      throw bgError;
    }
  } catch (error: any) {
    console.error('[BackgroundLocation] ❌ Error iniciando background location:', error);
    return { success: false, error: errorToString(error) };
  }
}

export async function stopBackgroundLocation(): Promise<void> {
  try {
    console.log('[BackgroundLocation] 🛑 Deteniendo seguimiento en background');
    
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log('[BackgroundLocation] ✅ Background location detenido');
    } else {
      console.log('[BackgroundLocation] ⚠️  Background location no estaba activo');
    }

    await AsyncStorage.removeItem(CREW_ID_KEY);
  } catch (error) {
    console.error('[BackgroundLocation] ❌ Error deteniendo background location:', error);
  }
}

export async function isTrackingLocation(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  } catch (error) {
    console.error('[BackgroundLocation] Error verificando estado:', error);
    return false;
  }
}

export async function ensureTrackingForCampo(
  tipoUsuario: string | null,
  cuadrillaId: number | null
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    console.log('[BackgroundLocation] 🔍 ensureTrackingForCampo called');
    console.log('[BackgroundLocation] - Tipo usuario:', tipoUsuario);
    console.log('[BackgroundLocation] - Cuadrilla ID:', cuadrillaId);

    const tipoNormalizado = (tipoUsuario || '').toLowerCase().trim();
    const esCampo = tipoNormalizado === 'campo';

    if (!esCampo) {
      console.log('[BackgroundLocation] ℹ️  Usuario no es CAMPO, no se inicia seguimiento');
      return { success: true, message: 'No aplica para este tipo de usuario' };
    }

    if (!cuadrillaId) {
      console.error('[BackgroundLocation] ❌ Usuario CAMPO sin ID de cuadrilla');
      return { success: false, error: 'Usuario CAMPO sin ID de cuadrilla' };
    }

    const isAlreadyTracking = await isTrackingLocation();
    if (isAlreadyTracking) {
      console.log('[BackgroundLocation] ℹ️  Seguimiento ya está activo (idempotente)');
      return { success: true, message: 'Seguimiento ya activo' };
    }

    console.log('[BackgroundLocation] 🚀 Iniciando seguimiento automático para usuario CAMPO');
    console.log('[BackgroundLocation] 🎯 Cuadrilla ID:', cuadrillaId);

    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.error('[BackgroundLocation] ❌ Permiso foreground denegado');
      return {
        success: false,
        error: 'Permiso de ubicación en primer plano denegado. Puedes activarlo manualmente desde Perfil.'
      };
    }

    console.log('[BackgroundLocation] ✅ Permiso foreground concedido');

    if (isExpoGo()) {
      console.log('[BackgroundLocation] ℹ️  Expo Go - usando solo foreground');
      await AsyncStorage.setItem(CREW_ID_KEY, cuadrillaId.toString());
      return {
        success: true,
        message: 'Seguimiento en modo foreground (Expo Go)'
      };
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.log('[BackgroundLocation] ⚠️  Permiso background denegado, usando foreground');
      await AsyncStorage.setItem(CREW_ID_KEY, cuadrillaId.toString());
      return {
        success: true,
        message: 'Seguimiento en modo foreground (permiso background denegado)'
      };
    }

    console.log('[BackgroundLocation] ✅ Permiso background concedido');

    const isTaskDefined = await TaskManager.isTaskDefined(LOCATION_TASK_NAME);
    if (!isTaskDefined) {
      console.error('[BackgroundLocation] ❌ Task no está definida');
      return { success: false, error: 'Background task no está registrada' };
    }

    await AsyncStorage.setItem(CREW_ID_KEY, cuadrillaId.toString());
    console.log('[BackgroundLocation] 💾 ID guardado en AsyncStorage:', cuadrillaId);

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 0,
      foregroundService: {
        notificationTitle: 'Seguimiento de ubicación',
        notificationBody: 'La app está rastreando tu ubicación en segundo plano',
        notificationColor: '#2563EB',
      },
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
    });

    console.log('[BackgroundLocation] ✅ Seguimiento automático iniciado exitosamente');
    return { success: true, message: 'Seguimiento iniciado automáticamente' };
  } catch (error: any) {
    console.error('[BackgroundLocation] ❌ Error en ensureTrackingForCampo:', error);
    return { success: false, error: errorToString(error) };
  }
}

export { LOCATION_TASK_NAME, syncPendingLocations };
