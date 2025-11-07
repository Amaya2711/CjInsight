import { router } from "expo-router";
import { LogOut, User as UserIcon, Building2, MapPin, StopCircle, Activity } from "lucide-react-native";
import React, { useState, useEffect, useRef } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert, Platform } from "react-native";
import { useAuthStore } from "@/store/authStore";
import * as Location from "expo-location";
import { supabase } from "@/utils/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from '@react-native-community/netinfo';
import { runDiagnostics } from "@/utils/diagnostics";

import { startBackgroundLocation, stopBackgroundLocation, isTrackingLocation } from "@/services/backgroundLocation";

const TRACKING_KEY = "location_tracking_active";

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    checkTrackingStatus();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") {
      checkBackgroundTrackingStatus();
    }
  }, [user]);

  const checkTrackingStatus = async () => {
    try {
      const status = await AsyncStorage.getItem(TRACKING_KEY);
      const tracking = status === "true";
      setIsTracking(tracking);
      
      if (tracking && user?.id) {
        startLocationUpdates();
      }
    } catch (error) {
      console.error("[Profile] Error checking tracking status:", error);
    }
  };

  const checkBackgroundTrackingStatus = async () => {
    if (!user?.id) return;
    
    try {
      const isActive = await isTrackingLocation();
      console.log("[Profile] Background tracking status:", isActive);
      
      if (isActive) {
        setIsTracking(true);
        await AsyncStorage.setItem(TRACKING_KEY, "true");
        startLocationUpdates();
      }
    } catch (error) {
      console.error("[Profile] Error checking background tracking:", error);
    }
  };

  const handleLogout = async () => {
    if (isTracking) {
      Alert.alert(
        "Detener seguimiento",
        "El seguimiento de ubicación se detendrá automáticamente al cerrar sesión.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Cerrar Sesión",
            style: "destructive",
            onPress: async () => {
              await signOut();
              router.replace("/login");
            },
          },
        ]
      );
      return;
    }
    await signOut();
    router.replace("/login");
  };

  const updateLocation = async () => {
    if (!user?.id) return;

    try {
      const netState = await NetInfo.fetch();
      const isOnline = !!(netState.isConnected && netState.isInternetReachable !== false);
      
      if (!isOnline) {
        console.log("[Profile] 📴 Sin conexión - esperando reconexión...");
        return;
      }
      
      console.log("[Profile] 🌐 Conexión verificada");
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      setCurrentLocation({ latitude, longitude });
      setLastUpdate(new Date());
      
      console.log("[Profile] 📍 Nueva ubicación:");
      console.log("[Profile] 🎯 Actualizando ID:", user.id);
      console.log("[Profile] 📍 Latitud:", latitude);
      console.log("[Profile] 📍 Longitud:", longitude);

      const { data, error } = await supabase
        .from("cuadrillas")
        .update({
          latitud: latitude,
          longitud: longitude,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select();

      if (error) {
        if (error.message?.includes('Failed to fetch') || error.message?.includes('Network request failed')) {
          console.log("[Profile] 🌐 Error de red - esperando reconexión...");
        } else {
          console.error("[Profile] ❌ Error Supabase:", error.message);
        }
      } else if (data && data.length > 0) {
        console.log("[Profile] ✅ Ubicación actualizada exitosamente");
        console.log("[Profile] 🎯 ID actualizado:", user.id);
        console.log("[Profile] 📍 Latitud:", data[0].latitud);
        console.log("[Profile] 📍 Longitud:", data[0].longitud);
      } else if (!error) {
        console.log("[Profile] ⚠️ Sin datos devueltos - verificar permisos RLS");
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      
      if (errorMsg.includes('Network request failed') || 
          errorMsg.includes('Failed to fetch') || 
          errorMsg.includes('network') ||
          errorMsg.includes('timeout')) {
        console.log("[Profile] 🌐 Sin conexión - esperando reconexión...");
      } else {
        console.error("[Profile] ❌ Error inesperado:", errorMsg);
      }
    }
  };

  const startLocationUpdates = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    updateLocation();
    
    intervalRef.current = setInterval(() => {
      updateLocation();
    }, 5000);

    console.log("[Profile] ✅ Actualizaciones de ubicación iniciadas (cada 5s)");
  };

  const stopLocationUpdates = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log("[Profile] 🛑 Actualizaciones de ubicación detenidas");
    }
  };

  const startLocationTracking = async () => {
    if (!user?.id) {
      Alert.alert("Error", "No se encontró ID de cuadrilla");
      return;
    }

    setIsLoading(true);
    console.log("[Profile] 🚀 Iniciando seguimiento de ubicación");
    console.log("[Profile] 🎯 ID Cuadrilla:", user.id);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Error", "Permiso de ubicación denegado");
        setIsLoading(false);
        return;
      }

      console.log("[Profile] ✅ Permisos concedidos");

      if (Platform.OS !== "web") {
        const isActive = await isTrackingLocation();
        if (isActive) {
          console.log("[Profile] ℹ️ Seguimiento ya está activo desde el login");
        } else {
          const bgResult = await startBackgroundLocation(user.id);
          if (bgResult.success) {
            console.log("[Profile] ✅ Background location iniciado");
            if (bgResult.usingForeground) {
              console.log("[Profile] ℹ️ Usando modo foreground");
            }
          } else {
            console.error("[Profile] ❌ Error iniciando background:", bgResult.error);
          }
        }
      }

      startLocationUpdates();

      await AsyncStorage.setItem(TRACKING_KEY, "true");
      setIsTracking(true);
      
      const message = Platform.OS === 'web' 
        ? "Seguimiento iniciado. Mantén la app abierta."
        : "Seguimiento iniciado. Puedes cambiar de pantalla.";
      
      Alert.alert("Éxito", message);
      console.log("[Profile] ✅ Seguimiento iniciado");
    } catch (error) {
      console.error("[Profile] ❌ Error iniciando seguimiento:", error);
      Alert.alert("Error", "No se pudo iniciar el seguimiento de ubicación");
    } finally {
      setIsLoading(false);
    }
  };



  const stopLocationTracking = async () => {
    setIsLoading(true);
    console.log("[Profile] 🛑 Deteniendo seguimiento de ubicación");

    try {
      stopLocationUpdates();

      if (Platform.OS !== "web") {
        await stopBackgroundLocation();
        console.log("[Profile] ✅ Background location detenido");
      }

      await AsyncStorage.removeItem(TRACKING_KEY);
      setIsTracking(false);
      setCurrentLocation(null);
      setLastUpdate(null);
      
      Alert.alert("Éxito", "Seguimiento de ubicación detenido");
      console.log("[Profile] ✅ Seguimiento detenido");
    } catch (error) {
      console.error("[Profile] ❌ Error deteniendo seguimiento:", error);
      Alert.alert("Error", "No se pudo detener el seguimiento");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.emptyContainer}>
        <UserIcon size={48} color="#9CA3AF" />
        <Text style={styles.emptyText}>No has iniciado sesión</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <UserIcon size={48} color="#2563EB" strokeWidth={2} />
          </View>

          <Text style={styles.name}>{user.nombre_usuario}</Text>
          {user.tipo_usuario && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {user.tipo_usuario === "OFICINA" ? "OFICINA" : "CAMPO"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Información de usuario</Text>

          <View style={styles.infoRow}>
            <UserIcon size={20} color="#6B7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Usuario</Text>
              <Text style={styles.infoValue}>{user.nombre_usuario}</Text>
            </View>
          </View>

          {user.tipo_usuario && (
            <View style={styles.infoRow}>
              <Building2 size={20} color="#6B7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tipo de usuario</Text>
                <Text style={styles.infoValue}>
                  {user.tipo_usuario === "OFICINA" ? "Oficina" : "Campo"}
                </Text>
              </View>
            </View>
          )}

          {user.id && (
            <View style={styles.infoRow}>
              <Building2 size={20} color="#6B7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>ID de Cuadrilla</Text>
                <Text style={styles.infoValue}>{user.id}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Información del sistema</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>ID de usuario</Text>
              <Text style={styles.infoValue}>{user.id_usuario}</Text>
            </View>
          </View>
        </View>

        {user?.tipo_usuario === "CAMPO" && (
          <>
            {isTracking && currentLocation && (
              <View style={styles.locationCard}>
                <Text style={styles.locationTitle}>📍 Ubicación Actual</Text>
                <View style={styles.locationRow}>
                  <Text style={styles.locationLabel}>Latitud:</Text>
                  <Text style={styles.locationValue}>{currentLocation.latitude.toFixed(6)}</Text>
                </View>
                <View style={styles.locationRow}>
                  <Text style={styles.locationLabel}>Longitud:</Text>
                  <Text style={styles.locationValue}>{currentLocation.longitude.toFixed(6)}</Text>
                </View>
                {lastUpdate && (
                  <Text style={styles.locationTime}>
                    Última actualización: {lastUpdate.toLocaleTimeString()}
                  </Text>
                )}
                <Text style={styles.locationNote}>
                  ⏱️ Se actualiza cada 5 segundos
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.trackingButton,
                isTracking && styles.trackingButtonActive,
              ]}
              onPress={isTracking ? stopLocationTracking : startLocationTracking}
              disabled={isLoading}
            >
              {isTracking ? (
                <Activity size={20} color="#10B981" />
              ) : (
                <MapPin size={20} color="#FFFFFF" />
              )}
              <Text
                style={[
                  styles.trackingButtonText,
                  isTracking && styles.trackingButtonTextActive,
                ]}
              >
                {isLoading
                  ? "Cargando..."
                  : isTracking
                  ? "✅ Ruta Activa"
                  : "Iniciar Ruta"}
              </Text>
            </TouchableOpacity>
            
            {isTracking && (
              <Text style={styles.autoStartNote}>
                ✨ Ruta iniciada automáticamente al iniciar sesión
              </Text>
            )}
            
            {!isTracking && (
              <Text style={styles.manualStartNote}>
                💡 El seguimiento se inicia automáticamente al iniciar sesión. Usa este botón solo si necesitas reiniciar el seguimiento.
              </Text>
            )}
            
            {Platform.OS !== 'web' && isTracking && (
              <Text style={styles.backgroundNote}>
                ✅ El seguimiento continúa aunque cambies de pantalla o cierres la app
              </Text>
            )}
          </>
        )}

        <TouchableOpacity 
          style={styles.diagnosticsButton} 
          onPress={() => {
            runDiagnostics();
            Alert.alert(
              "Diagnóstico",
              "Los resultados se muestran en la consola del navegador/terminal. Abre las herramientas de desarrollo para verlos."
            );
          }}
        >
          <Activity size={20} color="#2563EB" />
          <Text style={styles.diagnosticsButtonText}>Ejecutar Diagnóstico</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#DC2626" />
          <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <Text style={styles.version}>CJ Insight Mobile v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  content: {
    padding: 16,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#111827",
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 20,
  },
  roleText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#2563EB",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#111827",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#111827",
  },
  statusActive: {
    color: "#16A34A",
  },
  diagnosticsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginBottom: 12,
  },
  diagnosticsButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#2563EB",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    marginBottom: 16,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#DC2626",
  },
  trackingButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 12,
  },
  trackingButtonActive: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#10B981",
  },
  trackingButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  trackingButtonTextActive: {
    color: "#10B981",
  },

  version: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  locationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#10B981",
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#111827",
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  locationLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600" as const,
  },
  locationValue: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#10B981",
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  locationTime: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 8,
    textAlign: "center",
  },
  locationNote: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
    fontStyle: "italic" as const,
  },
  backgroundNote: {
    fontSize: 13,
    color: "#10B981",
    textAlign: "center",
    marginTop: 8,
    fontWeight: "600" as const,
  },
  autoStartNote: {
    fontSize: 12,
    color: "#10B981",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic" as const,
  },
  manualStartNote: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic" as const,
    paddingHorizontal: 16,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#F9FAFB",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#374151",
    marginTop: 16,
  },
});
