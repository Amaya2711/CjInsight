import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform, AppState } from 'react-native';
import * as Location from 'expo-location';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Linking from 'expo-linking';
import { MapPin, AlertTriangle } from 'lucide-react-native';

type LocationGateProps = {
  onPermissionsGranted: () => void;
  onLogout: () => void;
};

export function LocationGate({ onPermissionsGranted, onLogout }: LocationGateProps) {
  const [showQuestion, setShowQuestion] = useState(true);
  const [checking, setChecking] = useState(true);
  const [requestingPermissions, setRequestingPermissions] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkPermissionsCallback = React.useCallback(async () => {
    try {
      console.log('[LocationGate] 🔍 Verificando permisos...');
      
      const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
      
      if (Platform.OS === 'web') {
        console.log('[LocationGate] Web - verificando permisos foreground:', foregroundStatus);
        if (foregroundStatus === 'granted') {
          console.log('[LocationGate] ✅ Web - permisos concedidos');
          onPermissionsGranted();
          return;
        }
        console.log('[LocationGate] ❌ Web - permisos no concedidos');
        setChecking(false);
        return;
      }

      const hasLocationEnabled = await Location.hasServicesEnabledAsync();
      console.log('[LocationGate] - Servicios de ubicación habilitados:', hasLocationEnabled);
      
      if (!hasLocationEnabled) {
        console.log('[LocationGate] ❌ Servicios de ubicación desactivados');
        setErrorMessage('Los servicios de ubicación están desactivados. Por favor, actívalos en Ajustes.');
        setChecking(false);
        return;
      }

      const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
      
      console.log('[LocationGate] - Foreground:', foregroundStatus);
      console.log('[LocationGate] - Background:', backgroundStatus);
      
      if (foregroundStatus === 'granted' && backgroundStatus === 'granted') {
        console.log('[LocationGate] ✅ Todos los permisos concedidos');
        setErrorMessage(null);
        onPermissionsGranted();
      } else {
        console.log('[LocationGate] ❌ Permisos faltantes');
        if (foregroundStatus !== 'granted') {
          setErrorMessage('Necesitas conceder permisos de ubicación en primer plano.');
        } else if (backgroundStatus !== 'granted') {
          setErrorMessage('Necesitas conceder permisos de ubicación "Siempre" o en segundo plano.');
        }
        setChecking(false);
      }
    } catch (error) {
      console.error('[LocationGate] Error verificando permisos:', error);
      setErrorMessage('Error al verificar permisos de ubicación.');
      setChecking(false);
    }
  }, [onPermissionsGranted]);

  useEffect(() => {
    checkPermissionsCallback();
  }, [checkPermissionsCallback]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && !checking) {
        console.log('[LocationGate] App volvió al frente, re-verificando permisos...');
        setChecking(true);
        setTimeout(() => {
          checkPermissionsCallback();
        }, 500);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checking, checkPermissionsCallback]);

  const requestPermissionsAndStart = async () => {
    if (requestingPermissions) {
      console.log('[LocationGate] Ya se está solicitando permisos, omitiendo...');
      return;
    }

    try {
      setRequestingPermissions(true);
      setErrorMessage(null);
      console.log('[LocationGate] 🚀 Iniciando flujo de permisos...');

      if (Platform.OS === 'web') {
        console.log('[LocationGate] Web - solicitando permisos de ubicación');
        const { status } = await Location.requestForegroundPermissionsAsync();
        console.log('[LocationGate] Web - resultado:', status);
        if (status === 'granted') {
          onPermissionsGranted();
        } else {
          setErrorMessage('Permiso denegado. Permite el acceso a la ubicación en tu navegador.');
        }
        setRequestingPermissions(false);
        return;
      }

      const hasLocationEnabled = await Location.hasServicesEnabledAsync();
      console.log('[LocationGate] - Servicios habilitados:', hasLocationEnabled);
      
      if (!hasLocationEnabled) {
        console.log('[LocationGate] ⚠️ Servicios desactivados, abriendo ajustes...');
        
        if (Platform.OS === 'ios') {
          await Linking.openURL('app-settings:');
        } else if (Platform.OS === 'android') {
          await IntentLauncher.startActivityAsync(
            IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS
          );
        }
        
        setErrorMessage('Activa los servicios de ubicación y vuelve a la app.');
        setRequestingPermissions(false);
        return;
      }

      console.log('[LocationGate] 📍 Solicitando permiso foreground...');
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      console.log('[LocationGate] - Resultado foreground:', foregroundStatus);

      if (foregroundStatus !== 'granted') {
        console.log('[LocationGate] ❌ Permiso foreground denegado');
        setErrorMessage('Permiso de ubicación denegado. Debes concederlo para usar la app.');
        
        Alert.alert(
          'Permiso necesario',
          'Debes conceder permisos de ubicación para usar la app. Ve a Ajustes para activarlos.',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Ir a Ajustes',
              onPress: async () => {
                if (Platform.OS === 'ios') {
                  await Linking.openURL('app-settings:');
                } else if (Platform.OS === 'android') {
                  await Linking.openSettings();
                }
              },
            },
          ]
        );
        setRequestingPermissions(false);
        return;
      }

      console.log('[LocationGate] 📍 Solicitando permiso background...');
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      console.log('[LocationGate] - Resultado background:', backgroundStatus);

      if (backgroundStatus !== 'granted') {
        console.log('[LocationGate] ⚠️ Permiso background denegado');
        setErrorMessage('Necesitas conceder permisos "Siempre" o en segundo plano.');
        
        Alert.alert(
          'Permiso de segundo plano necesario',
          'Para que la app funcione correctamente, debes seleccionar "Siempre" o "Permitir todo el tiempo" en los ajustes de ubicación.',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Ir a Ajustes',
              onPress: async () => {
                if (Platform.OS === 'ios') {
                  await Linking.openURL('app-settings:');
                } else if (Platform.OS === 'android') {
                  await Linking.openSettings();
                }
              },
            },
          ]
        );
        setRequestingPermissions(false);
        return;
      }

      console.log('[LocationGate] ✅ Todos los permisos concedidos, iniciando tracking...');
      setRequestingPermissions(false);
      onPermissionsGranted();
    } catch (error) {
      console.error('[LocationGate] Error en flujo de permisos:', error);
      setErrorMessage('Error al solicitar permisos. Intenta de nuevo.');
      setRequestingPermissions(false);
    }
  };

  if (checking) {
    return null;
  }

  if (showQuestion) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <AlertTriangle size={80} color="#DC2626" strokeWidth={1.5} />
          </View>

          <Text style={styles.title}>SE INFORMARÁ A GERENCIA QUE NO SE ACTIVÓ LA UBICACIÓN.</Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.subtitle}>¿Deseas activar la ubicación para usar la app?</Text>

          <View style={styles.buttonsRow}>
            <TouchableOpacity 
              style={styles.noButton} 
              onPress={() => {
                console.log('[LocationGate] Usuario respondió NO, cerrando sesión...');
                onLogout();
              }}
            >
              <Text style={styles.noButtonText}>NO</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.yesButton} 
              onPress={() => {
                console.log('[LocationGate] Usuario respondió SÍ, procediendo a activar ubicación...');
                setShowQuestion(false);
                requestPermissionsAndStart();
              }}
            >
              <Text style={styles.yesButtonText}>SÍ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <AlertTriangle size={80} color="#DC2626" strokeWidth={1.5} />
        </View>

        <Text style={styles.title}>SE INFORMARÁ A GERENCIA QUE NO SE ACTIVÓ LA UBICACIÓN.</Text>
        
        <View style={styles.divider} />
        
        <Text style={styles.subtitle}>Para usar la app debes activar la ubicación.</Text>

        <View style={styles.instructionsContainer}>
          <View style={styles.instructionRow}>
            <MapPin size={20} color="#6B7280" />
            <Text style={styles.instructionText}>Activa los servicios de ubicación</Text>
          </View>
          <View style={styles.instructionRow}>
            <MapPin size={20} color="#6B7280" />
            <Text style={styles.instructionText}>Concede permisos en primer plano</Text>
          </View>
          <View style={styles.instructionRow}>
            <MapPin size={20} color="#6B7280" />
            <Text style={styles.instructionText}>Concede permisos &quot;Siempre&quot; o en segundo plano</Text>
          </View>
        </View>

        {errorMessage && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.primaryButton, requestingPermissions && styles.primaryButtonDisabled]} 
          onPress={requestPermissionsAndStart}
          disabled={requestingPermissions}
        >
          <MapPin size={24} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>
            {requestingPermissions ? 'Procesando...' : 'Activar ubicación'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={onLogout}>
          <Text style={styles.secondaryButtonText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
    padding: 20,
    backgroundColor: '#FEE2E2',
    borderRadius: 100,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 26,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  instructionsContainer: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  primaryButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  secondaryButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  errorContainer: {
    width: '100%',
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginTop: 24,
  },
  noButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  noButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  yesButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  yesButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
