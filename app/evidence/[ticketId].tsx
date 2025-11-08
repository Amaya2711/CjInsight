import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Camera, Check, CheckSquare, Image as ImageIcon, MapPin, RefreshCw, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import SafeImage from "@/src/components/SafeImage";
import { useAppStore } from "@/store/useAppStore";
import type { EvidenceType } from "@/types";
import { calculateDistance } from "@/utils/validation";

const GEOFENCE_RADIUS = 300;

export default function EvidenceCaptureScreen() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const { getEvidenceBundleByTicketId, addEvidenceItem, addToSyncQueue, getTicketById, getSiteById } = useAppStore();

  const [photoBefore, setPhotoBefore] = useState<string | null>(null);
  const [photoAfter, setPhotoAfter] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState({
    tipo_falla: "",
    accion_realizada: "",
    repuestos_usados: [] as string[],
    pruebas_post: "",
    observaciones: "",
  });

  const evidenceBundle = getEvidenceBundleByTicketId(ticketId);
  const ticket = getTicketById(ticketId);
  const site = ticket ? getSiteById(ticket.siteId) : undefined;

  useEffect(() => {
    getCurrentLocation();
    const interval = setInterval(() => {
      getCurrentLocation();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (ticket && ticket.interventionType) {
      setChecklist(prev => ({
        ...prev,
        tipo_falla: ticket.interventionType || ""
      }));
    }
  }, [ticket]);

  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    setLocationError(null);
    try {
      console.log("[Location] Requesting permissions...");
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("[Location] Permission denied");
        setLocationError("Permiso de ubicación denegado");
        setIsLoadingLocation(false);
        return;
      }

      console.log("[Location] Getting current position...");
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 1,
      });
      
      console.log("[Location] Location obtained:", {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        accuracy: location.coords.accuracy,
      });
      
      setCurrentLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
      setLocationError(null);
    } catch (error) {
      console.error("[Location] Error getting location:", error);
      setLocationError("Error al obtener ubicación");
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS !== "web") {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const locationPermission = await Location.requestForegroundPermissionsAsync();

      if (
        cameraPermission.status !== "granted" ||
        mediaPermission.status !== "granted" ||
        locationPermission.status !== "granted"
      ) {
        Alert.alert(
          "Permisos requeridos",
          "Se necesitan permisos de cámara, galería y ubicación para capturar evidencia."
        );
        return false;
      }
    }
    return true;
  };

  const capturePhoto = async (type: "before" | "after") => {
    console.log(`[Evidence] Starting capture for ${type}`);
    
    if (!site) {
      Alert.alert("Error", "No se encontró el sitio asociado al ticket");
      return;
    }

    if (!currentLocation) {
      Alert.alert("Error", "No se pudo obtener tu ubicación actual. Intenta nuevamente.");
      await getCurrentLocation();
      return;
    }

    const distance = calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      site.lat,
      site.lng
    );

    console.log(`[Evidence] Distance to site: ${Math.round(distance)}m`);

    if (distance > GEOFENCE_RADIUS) {
      Alert.alert(
        "Fuera de rango",
        `Debes estar dentro de ${GEOFENCE_RADIUS}m del sitio para capturar evidencia. Distancia actual: ${Math.round(distance)}m`
      );
      return;
    }

    if (Platform.OS !== "web") {
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        console.log("[Evidence] Permissions denied");
        return;
      }
    }

    try {
      console.log("[Evidence] Launching camera...");
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        exif: true,
        allowsEditing: false,
      });

      console.log("[Evidence] Camera result:", { canceled: result.canceled, hasAssets: !!result.assets });

      if (!result.canceled && result.assets && result.assets[0]) {
        const uri = result.assets[0].uri;
        console.log(`[Evidence] Photo captured: ${uri}`);
        
        if (type === "before") {
          setPhotoBefore(uri);
        } else {
          setPhotoAfter(uri);
        }

        if (evidenceBundle) {
          addEvidenceItem({
            bundleId: evidenceBundle.id,
            type: type === "before" ? "photo_before" : "photo_after",
            url: uri,
            exif: result.assets[0].exif
              ? {
                  timestamp: new Date(),
                  gps: currentLocation,
                  ...result.assets[0].exif,
                }
              : null,
            geo: currentLocation,
            checklist: null,
          });

          addToSyncQueue({
            type: "evidence",
            ticketId,
            payload: { type: type === "before" ? "photo_before" : "photo_after", uri, geo: currentLocation },
          });

          console.log(`[Evidence] Photo saved to store`);
          Alert.alert("Éxito", "Foto capturada correctamente");
        } else {
          console.error("[Evidence] No evidence bundle found");
          Alert.alert("Error", "No se encontró el bundle de evidencia");
        }
      } else {
        console.log("[Evidence] Camera canceled or no assets");
      }
    } catch (error) {
      console.error("[Evidence] Error capturing photo:", error);
      Alert.alert("Error", `No se pudo capturar la foto: ${error}`);
    }
  };



  const saveChecklist = () => {
    if (!checklist.tipo_falla.trim() || !checklist.accion_realizada.trim()) {
      Alert.alert("Error", "Completa los campos obligatorios del checklist");
      return;
    }

    if (evidenceBundle) {
      addEvidenceItem({
        bundleId: evidenceBundle.id,
        type: "checklist",
        url: "",
        exif: null,
        geo: null,
        checklist,
      });

      addToSyncQueue({
        type: "evidence",
        ticketId,
        payload: { type: "checklist", checklist },
      });

      Alert.alert("Éxito", "Checklist guardado correctamente");
    }
  };

  const handleFinish = async () => {
    if (!photoBefore || !photoAfter || !checklist.tipo_falla) {
      Alert.alert(
        "Evidencia incompleta",
        "Debes capturar las fotos ANTES y DESPUÉS, y completar el checklist."
      );
      return;
    }

    try {
      if (ticket) {
        const { getTicketById: getTicketByIdFromDB, updateTicket: updateTicketInDB } = await import("@/services/tickets");
        const store = useAppStore.getState();
        
        store.updateTicket(ticketId, {
          status: "validar",
        });
        
        const ticketDB = await getTicketByIdFromDB(ticketId);
        if (ticketDB) {
          await updateTicketInDB(ticketDB.id, { estado: "validar" });
        }
        
        console.log("[Evidence] Ticket moved to VALIDAR state automatically");
      }
      
      Alert.alert("Éxito", "Evidencia capturada correctamente. El ticket pasará a validación.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("[Evidence] Error updating ticket status:", error);
      Alert.alert("Éxito", "Evidencia capturada correctamente", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Capturar Evidencia",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
              <X size={24} color="#111827" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.locationCard}>
            <MapPin size={20} color={currentLocation ? "#2563EB" : "#9CA3AF"} />
            <View style={styles.locationContent}>
              {isLoadingLocation ? (
                <Text style={styles.locationLabel}>Obteniendo ubicación...</Text>
              ) : locationError ? (
                <>
                  <Text style={styles.locationLabel}>Error de ubicación</Text>
                  <Text style={styles.locationError}>{locationError}</Text>
                </>
              ) : currentLocation && site ? (
                <>
                  <Text style={styles.locationLabel}>Ubicación actual</Text>
                  <Text style={styles.locationDistance}>
                    {Math.round(
                      calculateDistance(
                        currentLocation.lat,
                        currentLocation.lng,
                        site.lat,
                        site.lng
                      )
                    )}m del sitio
                  </Text>
                  <Text style={styles.locationCoords}>
                    {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                  </Text>
                </>
              ) : (
                <Text style={styles.locationLabel}>Ubicación no disponible</Text>
              )}
            </View>
            <TouchableOpacity
              onPress={getCurrentLocation}
              disabled={isLoadingLocation}
              style={styles.refreshButton}
            >
              <RefreshCw size={20} color="#2563EB" />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Camera size={20} color="#2563EB" />
              <Text style={styles.sectionTitle}>Fotos</Text>
            </View>

            <View style={styles.photoGrid}>
              <View style={styles.photoCard}>
                <Text style={styles.photoLabel}>Foto ANTES</Text>
                {photoBefore ? (
                  <SafeImage uri={photoBefore} style={styles.photoPreview} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <ImageIcon size={48} color="#9CA3AF" />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={() => capturePhoto("before")}
                >
                  <Camera size={16} color="#FFFFFF" />
                  <Text style={styles.captureButtonText}>
                    {photoBefore ? "Recapturar" : "Capturar"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.photoCard}>
                <Text style={styles.photoLabel}>Foto DESPUÉS</Text>
                {photoAfter ? (
                  <SafeImage uri={photoAfter} style={styles.photoPreview} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <ImageIcon size={48} color="#9CA3AF" />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={() => capturePhoto("after")}
                >
                  <Camera size={16} color="#FFFFFF" />
                  <Text style={styles.captureButtonText}>
                    {photoAfter ? "Recapturar" : "Capturar"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <CheckSquare size={20} color="#2563EB" />
              <Text style={styles.sectionTitle}>Checklist</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Tipo de falla <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={checklist.tipo_falla}
                onChangeText={(text) => setChecklist({ ...checklist, tipo_falla: text })}
                placeholder="Describe el tipo de falla"
                placeholderTextColor="#9CA3AF"
                editable={false}
              />
              {ticket?.interventionType && (
                <Text style={styles.helperText}>Tipo de falla asignado automáticamente del ticket</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Acción realizada <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={checklist.accion_realizada}
                onChangeText={(text) => setChecklist({ ...checklist, accion_realizada: text })}
                placeholder="Describe la acción realizada"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Pruebas post-intervención</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={checklist.pruebas_post}
                onChangeText={(text) => setChecklist({ ...checklist, pruebas_post: text })}
                placeholder="Describe las pruebas realizadas"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Observaciones</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={checklist.observaciones}
                onChangeText={(text) => setChecklist({ ...checklist, observaciones: text })}
                placeholder="Observaciones adicionales"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity style={styles.saveChecklistButton} onPress={saveChecklist}>
              <Check size={20} color="#FFFFFF" />
              <Text style={styles.saveChecklistButtonText}>Guardar Checklist</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
            <Check size={20} color="#FFFFFF" />
            <Text style={styles.finishButtonText}>Finalizar Captura</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginBottom: 16,
  },
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#1E40AF",
    marginBottom: 4,
  },
  locationDistance: {
    fontSize: 12,
    color: "#3B82F6",
    marginBottom: 2,
  },
  locationCoords: {
    fontSize: 10,
    color: "#6B7280",
  },
  locationError: {
    fontSize: 12,
    color: "#DC2626",
  },
  refreshButton: {
    padding: 8,
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#111827",
  },
  photoGrid: {
    flexDirection: "row",
    gap: 12,
  },
  photoCard: {
    flex: 1,
  },
  photoLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#374151",
    marginBottom: 8,
  },
  photoPreview: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  photoPlaceholder: {
    width: "100%",
    height: 150,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  captureButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#2563EB",
    paddingVertical: 10,
    borderRadius: 6,
  },
  captureButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },

  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#374151",
    marginBottom: 8,
  },
  required: {
    color: "#DC2626",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111827",
  },
  textArea: {
    minHeight: 80,
    paddingTop: 10,
  },
  saveChecklistButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    backgroundColor: "#16A34A",
    borderRadius: 8,
    marginTop: 8,
  },
  saveChecklistButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  finishButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    backgroundColor: "#2563EB",
    borderRadius: 12,
  },
  finishButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  inputDisabled: {
    backgroundColor: "#F3F4F6",
    color: "#6B7280",
  },
  helperText: {
    fontSize: 12,
    color: "#2563EB",
    marginTop: 4,
  },
});
