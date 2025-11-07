import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import {
  AlertCircle,
  Camera,
  CheckCircle,
  Check,
  Clock,
  FileText,
  MapPin,
  Search,
  Shield,
  Trash2,
  XCircle,
  Users,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import MapView from "../../src/components/MapView";
import { useAppStore } from "@/store/useAppStore";
import { getTicketById as getTicketByIdFromDB, mapTicketToApp, deleteTicket as deleteTicketFromDB, updateTicket as updateTicketInDB } from "@/services/tickets";
import { getSiteByCodigo, mapSiteToApp } from "@/services/sites";
import type { Priority } from "@/types";
import {
  calculateDistance,
  calculateSLADeadline,
  calculateSLARemaining,
  formatSLATime,
  getSLAHoursByPriority,
} from "@/utils/validation";

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const PRIORITY_COLORS: Record<Priority, { bg: string; text: string; border: string }> = {
  P0: { bg: "#FEE2E2", text: "#DC2626", border: "#FCA5A5" },
  P1: { bg: "#FFEDD5", text: "#EA580C", border: "#FDBA74" },
  P2: { bg: "#FEF3C7", text: "#CA8A04", border: "#FDE047" },
  P3: { bg: "#D1FAE5", text: "#16A34A", border: "#86EFAC" },
};

const GEOFENCE_RADIUS = 300;

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getTicketById,
    getSiteById,
    getDispatchByTicketId,
    getEvidenceBundleByTicketId,
    getEvidenceItemsByBundleId,
    updateDispatch,
    updateTicket,
    deleteTicket,
    addToSyncQueue,
    addDispatch,
    updateEvidenceBundle,
    currentUser,
    crews,
  } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [loadingTicket, setLoadingTicket] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [showCrewSelection, setShowCrewSelection] = useState(false);
  const [crewSearchQuery, setCrewSearchQuery] = useState("");
  const [reqA, setReqA] = useState(false);
  const [reqB, setReqB] = useState(false);

  const ticket = getTicketById(id);

  useEffect(() => {
    if (ticket) {
      setReqA(ticket.reqA || false);
      setReqB(ticket.reqB || false);
    }
  }, [ticket]);
  
  const site = ticket ? (() => {
    const directSite = getSiteById(ticket.siteId);
    if (directSite) return directSite;
    
    const siteBySiteId = useAppStore.getState().sites.find(s => 
      s.id === ticket.siteId || 
      s.siteCode === ticket.siteId || 
      (ticket as any).siteName === s.name
    );
    if (siteBySiteId) {
      console.log('[TicketDetail] Found site by matching:', siteBySiteId.siteCode);
      return siteBySiteId;
    }
    
    console.warn('[TicketDetail] Could not find site for ticket.siteId:', ticket.siteId);
    return undefined;
  })() : undefined;
  
  const dispatch = ticket ? getDispatchByTicketId(ticket.id) : undefined;
  const evidenceBundle = ticket ? getEvidenceBundleByTicketId(ticket.id) : undefined;
  const evidenceItems = evidenceBundle
    ? getEvidenceItemsByBundleId(evidenceBundle.id)
    : [];

  const isOfficeUser = currentUser?.userType === "oficina";
  const isFieldUser = currentUser?.userType === "campo";

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    loadTicketFromDB();
  }, [id]);

  const loadTicketFromDB = async () => {
    console.log('[TicketDetail] 📥 Loading ticket from Supabase:', id);
    setLoadingTicket(true);
    try {
      const result = await getTicketByIdFromDB(id);
      
      if (result) {
        const mapped = mapTicketToApp(result);
        
        const store = useAppStore.getState();
        const existingTicket = store.tickets.find(t => t.id === id || t.id === mapped.id);
        
        if (!existingTicket) {
          store.updateTicket(mapped.id, mapped);
        } else {
          store.updateTicket(existingTicket.id, mapped);
        }
        
        if (result.site_id) {
          const { data: siteData, error: siteError } = await getSiteByCodigo(result.site_id);
          
          if (siteData && !siteError) {
            const mappedSite = mapSiteToApp(siteData);
            
            const existingSite = store.sites.find(s => 
              s.id === mappedSite.id || 
              s.siteCode === mappedSite.siteCode
            );
            
            if (!existingSite) {
              store.sites.push(mappedSite);
            }
          }
        }
      }
    } catch (error) {
      console.error('[TicketDetail] ❌ Error loading ticket from DB:', error);
    } finally {
      setLoadingTicket(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    } catch (error) {
      console.error("[Location] Error getting location:", error);
    }
  };

  const handleAssignCrew = async (crewId: string) => {
    if (!ticket || !site) return;

    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() + 30 * 60 * 1000);
      const windowEnd = new Date(now.getTime() + 120 * 60 * 1000);

      addDispatch({
        ticketId: ticket.id,
        crewId: crewId,
        scheduledAt: now,
        windowStart,
        windowEnd,
        eta: null,
        arrivedAt: null,
        departedAt: null,
        arrivalWindowOk: null,
        arrivalGeo: null,
        reasonLate: null,
      });

      updateTicket(ticket.id, { status: "asignar" });

      const ticketDB = await getTicketByIdFromDB(ticket.id);
      if (ticketDB) {
        await updateTicketInDB(ticketDB.id, { estado: "asignar" });
      }

      setShowCrewSelection(false);
      Alert.alert("Éxito", "Cuadrilla asignada correctamente");
    } catch (error) {
      console.error("[Assign] Error:", error);
      Alert.alert("Error", "No se pudo asignar la cuadrilla");
    }
  };

  const handleArrival = async () => {
    if (!ticket || !site || !dispatch) return;

    setLoading(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Error", "Se requiere permiso de ubicación");
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const arrivalGeo = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };

      const distance = calculateDistance(arrivalGeo.lat, arrivalGeo.lng, site.lat, site.lng);
      const isInGeofence = distance <= GEOFENCE_RADIUS;

      if (!isInGeofence) {
        Alert.alert(
          "Fuera de rango",
          `Debes estar dentro de ${GEOFENCE_RADIUS}m del sitio para arribar. Distancia actual: ${Math.round(distance)}m`
        );
        setLoading(false);
        return;
      }

      const now = new Date();
      updateDispatch(dispatch.id, {
        arrivedAt: now,
        arrivalGeo,
        arrivalWindowOk: true,
      });

      updateTicket(ticket.id, { status: "arribo" });

      const ticketDB = await getTicketByIdFromDB(ticket.id);
      if (ticketDB) {
        await updateTicketInDB(ticketDB.id, { estado: "arribo" });
      }

      addToSyncQueue({
        type: "arrival",
        ticketId: ticket.id,
        payload: { arrivalGeo, arrivedAt: now },
      });

      Alert.alert("Éxito", "Llegada registrada correctamente");
    } catch (error) {
      console.error("[Arrival] Error:", error);
      Alert.alert("Error", "No se pudo registrar la llegada");
    } finally {
      setLoading(false);
    }
  };

  const handleNeutralize = async () => {
    if (!ticket) return;

    if (!reqA || !reqB) {
      Alert.alert("Error", "Debes marcar ambos requisitos (A y B) para neutralizar");
      return;
    }

    try {
      const now = new Date();
      updateTicket(ticket.id, {
        status: "neutralizar",
        neutralizedAt: now,
        reqA: true,
        reqB: true,
      });

      const ticketDB = await getTicketByIdFromDB(ticket.id);
      if (ticketDB) {
        await updateTicketInDB(ticketDB.id, { estado: "neutralizar" });
      }

      addToSyncQueue({
        type: "neutralize",
        ticketId: ticket.id,
        payload: { neutralizedAt: now, reqA: true, reqB: true },
      });

      Alert.alert("Éxito", "Falla neutralizada correctamente. Ahora puedes subir las evidencias.");
    } catch (error) {
      console.error("[Neutralize] Error:", error);
      Alert.alert("Error", "No se pudo neutralizar");
    }
  };

  const handleValidateEvidence = async (approved: boolean, reason?: string) => {
    if (!ticket || !evidenceBundle) return;

    const photoBefore = evidenceItems.find((item) => item.type === "photo_before");
    const photoAfter = evidenceItems.find((item) => item.type === "photo_after");

    if (!photoBefore || !photoAfter) {
      Alert.alert("Error", "Se requieren fotos ANTES y DESPUÉS para validar");
      return;
    }

    try {
      if (approved) {
        updateEvidenceBundle(evidenceBundle.id, {
          valid: true,
          validatedAt: new Date(),
          validatorUserId: currentUser?.id || null,
        });

        updateTicket(ticket.id, { status: "validar", validatedAt: new Date() });

        const ticketDB = await getTicketByIdFromDB(ticket.id);
        if (ticketDB) {
          await updateTicketInDB(ticketDB.id, { estado: "validar" });
        }

        Alert.alert("Éxito", "Evidencia aprobada. Ahora puedes cerrar el ticket.");
      } else {
        updateTicket(ticket.id, { status: "neutralizar" });

        const ticketDB = await getTicketByIdFromDB(ticket.id);
        if (ticketDB) {
          await updateTicketInDB(ticketDB.id, { estado: "neutralizar" });
        }

        Alert.alert("Evidencia rechazada", `El ticket ha regresado a NEUTRALIZAR. Motivo: ${reason || "No especificado"}`);
      }
    } catch (error) {
      console.error("[Validate] Error:", error);
      Alert.alert("Error", "No se pudo validar la evidencia");
    }
  };

  const handleClose = async () => {
    if (!ticket) return;

    try {
      const now = new Date();
      updateTicket(ticket.id, {
        status: "cierre",
        closedAt: now,
      });

      const ticketDB = await getTicketByIdFromDB(ticket.id);
      if (ticketDB) {
        await updateTicketInDB(ticketDB.id, { 
          estado: "cierre",
          complete_time: now.toISOString(),
        });
      }

      Alert.alert("Éxito", "Ticket cerrado correctamente");
    } catch (error) {
      console.error("[Close] Error:", error);
      Alert.alert("Error", "No se pudo cerrar el ticket");
    }
  };

  const handleDelete = async () => {
    if (!ticket) return;

    Alert.alert(
      "Eliminar ticket",
      "¿Estás seguro de que deseas eliminar este ticket de Supabase? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const ticketDB = await getTicketByIdFromDB(ticket.id);
              if (!ticketDB) {
                deleteTicket(ticket.id);
                Alert.alert("Éxito", "Ticket eliminado del store local", [
                  { text: "OK", onPress: () => router.back() },
                ]);
                return;
              }
              
              const { error } = await deleteTicketFromDB(ticketDB.id);
              
              if (error) {
                Alert.alert("Error", "No se pudo eliminar el ticket de Supabase: " + error.message);
                return;
              }
              
              deleteTicket(ticket.id);
              
              Alert.alert("Éxito", "Ticket eliminado correctamente de Supabase", [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch (error) {
              Alert.alert("Error", "Ocurrió un error al eliminar el ticket: " + String(error));
            }
          },
        },
      ]
    );
  };

  if (loadingTicket) {
    return (
      <View style={styles.errorContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={[styles.errorText, { color: "#2563EB", marginTop: 16 }]}>Cargando ticket...</Text>
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={48} color="#DC2626" />
        <Text style={styles.errorText}>Ticket no encontrado</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadTicketFromDB}
        >
          <Text style={styles.retryButtonText}>Reintentar carga desde BD</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  if (!site) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={48} color="#EA580C" />
        <Text style={styles.errorText}>Sitio no encontrado</Text>
      </View>
    );
  }

  const ticketWithSLA = ticket.slaDeadlineAt 
    ? ticket 
    : { ...ticket, slaDeadlineAt: calculateSLADeadline(ticket.openedAt, ticket.priority, site.zona) };
  
  const sla = calculateSLARemaining(ticketWithSLA);
  const slaHours = getSLAHoursByPriority(ticket.priority, site.zona);
  const colors = PRIORITY_COLORS[ticket.priority];

  const photoBefore = evidenceItems.find((item) => item.type === "photo_before");
  const photoAfter = evidenceItems.find((item) => item.type === "photo_after");

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {ticket.status === "cierre" && (
          <View style={styles.completedBanner}>
            <CheckCircle size={28} color="#16A34A" />
            <View style={styles.completedContent}>
              <Text style={styles.completedTitle}>✓ Ticket Cerrado</Text>
              {ticket.closedAt && (
                <Text style={styles.completedTime}>
                  Cerrado el {new Date(ticket.closedAt).toLocaleString("es-PE")}
                </Text>
              )}
            </View>
          </View>
        )}

        <View style={[styles.priorityBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <Text style={[styles.priorityText, { color: colors.text }]}>
            {ticket.priority} - PRIORIDAD
          </Text>
        </View>

        <Text style={styles.title}>{ticket.description || "Sin descripción"}</Text>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>Estado Actual</Text>
          <View style={styles.statusBadgeLarge}>
            <Text style={styles.statusTextLarge}>{ticket.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>Información del Ticket</Text>
          
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Ticket Source:</Text>
            <Text style={styles.metaValue}>{(ticket as any).ticketSource || ticket.id}</Text>
          </View>
          
          {ticket.interventionType && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Tipo de Atención:</Text>
              <Text style={styles.metaValue}>{ticket.interventionType}</Text>
            </View>
          )}
          
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Abierto:</Text>
            <Text style={styles.metaValue}>{ticket.openedAt.toLocaleString("es-PE")}</Text>
          </View>
        </View>

        <View style={[styles.slaCard, sla.isOverdue && styles.slaCardOverdue]}>
          <Clock size={20} color={sla.isOverdue ? "#DC2626" : "#2563EB"} />
          <View style={styles.slaContent}>
            <Text style={styles.slaLabel}>SLA: {slaHours}h (Zona: {site.zona})</Text>
            <Text style={[styles.slaValue, sla.isOverdue && styles.slaValueOverdue]}>
              {sla.isOverdue ? "VENCIDO" : formatSLATime(sla.remainingMinutes)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={20} color="#2563EB" />
            <Text style={styles.sectionTitle}>Sitio</Text>
          </View>

          <View style={styles.siteInfo}>
            <Text style={styles.siteName}>{site.name}</Text>
            <Text style={styles.siteCode}>{site.siteCode}</Text>
            <Text style={styles.siteLocation}>
              {site.zona}, {site.region}
            </Text>
          </View>

          <TouchableOpacity style={styles.mapButton} onPress={() => setShowMap(true)}>
            <MapPin size={16} color="#2563EB" />
            <Text style={styles.mapButtonText}>Ver mapa y geocerca</Text>
          </TouchableOpacity>
        </View>

        {isOfficeUser && ticket.status === "recepcion" && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Users size={20} color="#2563EB" />
              <Text style={styles.sectionTitle}>Asignar Cuadrilla</Text>
            </View>
            
            <Text style={styles.helpText}>
              Selecciona una cuadrilla para asignar este ticket
            </Text>

            <TouchableOpacity
              style={styles.assignButton}
              onPress={() => setShowCrewSelection(true)}
            >
              <Users size={20} color="#FFFFFF" />
              <Text style={styles.assignButtonText}>Seleccionar Cuadrilla</Text>
            </TouchableOpacity>
          </View>
        )}

        {isOfficeUser && (ticket.status === "asignar" || ticket.status === "arribo") && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={20} color="#2563EB" />
              <Text style={styles.sectionTitle}>En espera</Text>
            </View>
            
            <Text style={styles.helpText}>
              Esperando que la cuadrilla {ticket.status === "asignar" ? "arribe al sitio" : "neutralice la falla"}
            </Text>
          </View>
        )}

        {isFieldUser && ticket.status === "asignar" && dispatch && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MapPin size={20} color="#2563EB" />
              <Text style={styles.sectionTitle}>Confirmar Arribo</Text>
            </View>
            
            <Text style={styles.helpText}>
              Presiona el botón cuando llegues al sitio (dentro de {GEOFENCE_RADIUS}m)
            </Text>

            <TouchableOpacity
              style={[styles.arrivalButton, loading && styles.arrivalButtonDisabled]}
              onPress={handleArrival}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MapPin size={20} color="#FFFFFF" />
                  <Text style={styles.arrivalButtonText}>Arribé al Sitio</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {isFieldUser && ticket.status === "arribo" && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <FileText size={20} color="#2563EB" />
              <Text style={styles.sectionTitle}>Requisitos de Neutralización</Text>
            </View>
            
            <Text style={styles.helpText}>
              Marca los siguientes requisitos antes de neutralizar:
            </Text>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setReqA(!reqA)}
            >
              <View style={[styles.checkbox, reqA && styles.checkboxChecked]}>
                {reqA && <Check size={16} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>Requisito A: Verificación de seguridad completada</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setReqB(!reqB)}
            >
              <View style={[styles.checkbox, reqB && styles.checkboxChecked]}>
                {reqB && <Check size={16} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>Requisito B: Equipos verificados y operativos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.neutralizeButton, (!reqA || !reqB) && styles.neutralizeButtonDisabled]}
              onPress={handleNeutralize}
              disabled={!reqA || !reqB}
            >
              <FileText size={20} color="#FFFFFF" />
              <Text style={styles.neutralizeButtonText}>Neutralizar Falla</Text>
            </TouchableOpacity>
          </View>
        )}

        {isFieldUser && ticket.status === "neutralizar" && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Camera size={20} color="#2563EB" />
              <Text style={styles.sectionTitle}>Subir Evidencias</Text>
            </View>
            
            <Text style={styles.helpText}>
              Sube las fotos ANTES y DESPUÉS del trabajo realizado
            </Text>

            <View style={styles.evidenceGrid}>
              <View
                style={[
                  styles.evidenceItem,
                  photoBefore && styles.evidenceItemComplete,
                ]}
              >
                {photoBefore ? (
                  <CheckCircle size={24} color="#16A34A" />
                ) : (
                  <XCircle size={24} color="#9CA3AF" />
                )}
                <Text style={styles.evidenceLabel}>Foto ANTES</Text>
              </View>

              <View
                style={[
                  styles.evidenceItem,
                  photoAfter && styles.evidenceItemComplete,
                ]}
              >
                {photoAfter ? (
                  <CheckCircle size={24} color="#16A34A" />
                ) : (
                  <XCircle size={24} color="#9CA3AF" />
                )}
                <Text style={styles.evidenceLabel}>Foto DESPUÉS</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.captureButton}
              onPress={() =>
                router.push({ pathname: "/evidence/[ticketId]", params: { ticketId: ticket.id } })
              }
            >
              <Camera size={20} color="#2563EB" />
              <Text style={styles.captureButtonText}>Capturar evidencia</Text>
            </TouchableOpacity>
          </View>
        )}

        {isOfficeUser && ticket.status === "neutralizar" && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={20} color="#2563EB" />
              <Text style={styles.sectionTitle}>En espera</Text>
            </View>
            
            <Text style={styles.helpText}>
              Esperando que la cuadrilla suba las evidencias
            </Text>
          </View>
        )}

        {isOfficeUser && ticket.status === "validar" && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Camera size={20} color="#2563EB" />
              <Text style={styles.sectionTitle}>Validar Evidencias</Text>
            </View>
            
            <View style={styles.evidenceGrid}>
              <View
                style={[
                  styles.evidenceItem,
                  photoBefore && styles.evidenceItemComplete,
                ]}
              >
                {photoBefore ? (
                  <CheckCircle size={24} color="#16A34A" />
                ) : (
                  <XCircle size={24} color="#9CA3AF" />
                )}
                <Text style={styles.evidenceLabel}>Foto ANTES</Text>
              </View>

              <View
                style={[
                  styles.evidenceItem,
                  photoAfter && styles.evidenceItemComplete,
                ]}
              >
                {photoAfter ? (
                  <CheckCircle size={24} color="#16A34A" />
                ) : (
                  <XCircle size={24} color="#9CA3AF" />
                )}
                <Text style={styles.evidenceLabel}>Foto DESPUÉS</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.captureButton}
              onPress={() =>
                router.push({ pathname: "/evidence/[ticketId]", params: { ticketId: ticket.id } })
              }
            >
              <Camera size={20} color="#2563EB" />
              <Text style={styles.captureButtonText}>Ver evidencia</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.validateButton}
              onPress={() => handleValidateEvidence(true)}
            >
              <CheckCircle size={20} color="#FFFFFF" />
              <Text style={styles.validateButtonText}>Aprobar Evidencia</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => {
                Alert.alert(
                  "Rechazar Evidencia",
                  "¿Estás seguro de que deseas rechazar las evidencias? El ticket volverá a NEUTRALIZAR.",
                  [
                    { text: "Cancelar", style: "cancel" },
                    {
                      text: "Rechazar",
                      style: "destructive",
                      onPress: () => handleValidateEvidence(false, "Evidencias no válidas"),
                    },
                  ]
                );
              }}
            >
              <XCircle size={20} color="#DC2626" />
              <Text style={styles.rejectButtonText}>Rechazar Evidencia</Text>
            </TouchableOpacity>

            {evidenceBundle?.valid && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
              >
                <FileText size={20} color="#FFFFFF" />
                <Text style={styles.closeButtonText}>Cerrar Ticket</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {isFieldUser && ticket.status === "validar" && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={20} color="#2563EB" />
              <Text style={styles.sectionTitle}>En espera</Text>
            </View>
            
            <Text style={styles.helpText}>
              Esperando que oficina valide las evidencias
            </Text>
          </View>
        )}

        {isOfficeUser && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Trash2 size={20} color="#DC2626" />
            <Text style={styles.deleteButtonText}>Eliminar Ticket</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={showMap} animationType="slide" onRequestClose={() => setShowMap(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Mapa y Geocerca</Text>
            <TouchableOpacity onPress={() => setShowMap(false)}>
              <Text style={styles.modalClose}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          <MapView
            site={site}
            currentLocation={currentLocation}
            geofenceRadius={GEOFENCE_RADIUS}
          />
        </View>
      </Modal>

      <Modal visible={showCrewSelection} animationType="slide" onRequestClose={() => setShowCrewSelection(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleccionar Cuadrilla</Text>
            <TouchableOpacity onPress={() => setShowCrewSelection(false)}>
              <Text style={styles.modalClose}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.crewSearchContainer}>
            <View style={styles.crewSearchInputContainer}>
              <Search size={20} color="#9CA3AF" />
              <TextInput
                style={styles.crewSearchInput}
                placeholder="Buscar cuadrilla por nombre o categoría..."
                value={crewSearchQuery}
                onChangeText={setCrewSearchQuery}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <ScrollView style={styles.crewList}>
            {(() => {
              const filteredCrews = crews
                .filter((crew) => {
                  const matchesSearch = crewSearchQuery.trim() === "" || 
                    crew.name.toLowerCase().includes(crewSearchQuery.toLowerCase()) ||
                    (crew.categoria && crew.categoria.toLowerCase().includes(crewSearchQuery.toLowerCase()));
                  return matchesSearch && crew.currentLocation;
                })
                .map((crew) => {
                  const distance = crew.currentLocation && site
                    ? haversineDistance(
                        crew.currentLocation.lat,
                        crew.currentLocation.lng,
                        site.lat,
                        site.lng
                      )
                    : 999999;
                  return { crew, distance };
                })
                .sort((a, b) => a.distance - b.distance);

              if (filteredCrews.length === 0) {
                return (
                  <View style={styles.emptyCrewState}>
                    <Users size={48} color="#9CA3AF" />
                    <Text style={styles.emptyCrewText}>
                      {crewSearchQuery ? "No se encontraron cuadrillas" : "No hay cuadrillas disponibles"}
                    </Text>
                  </View>
                );
              }

              return filteredCrews.map(({ crew, distance }) => {
                return (
                  <TouchableOpacity
                    key={crew.id}
                    style={styles.crewCard}
                    onPress={() => {
                      handleAssignCrew(crew.id);
                      setCrewSearchQuery("");
                    }}
                  >
                    <View style={styles.crewCardHeader}>
                      <Text style={styles.crewName}>{crew.name}</Text>
                      {crew.categoria && (
                        <View style={styles.crewTypeBadge}>
                          <Text style={styles.crewTypeText}>Categoría {crew.categoria}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.crewCardDetails}>
                      <View style={styles.crewDetailRow}>
                        <Text style={styles.crewLabel}>Distancia:</Text>
                        <Text style={styles.crewValue}>{distance.toFixed(1)} km</Text>
                      </View>
                      <View style={styles.crewDetailRow}>
                        <Text style={styles.crewLabel}>Zona:</Text>
                        <Text style={styles.crewValue}>{crew.zone}</Text>
                      </View>
                      <View style={styles.crewDetailRow}>
                        <Text style={styles.crewLabel}>Estado:</Text>
                        <Text style={[styles.crewValue, { color: crew.status === "disponible" ? "#16A34A" : "#EF4444" }]}>
                          {crew.status === "disponible" ? "Disponible" : crew.status === "ocupado" ? "Ocupado" : "Fuera de servicio"}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              });
            })()}
          </ScrollView>
        </View>
      </Modal>
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
  priorityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 16,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "700" as const,
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#111827",
    marginBottom: 16,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionCardTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#111827",
    marginBottom: 12,
  },
  statusBadgeLarge: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    alignItems: "center",
  },
  statusTextLarge: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#2563EB",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginRight: 8,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#111827",
    flex: 1,
  },
  slaCard: {
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
  slaCardOverdue: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
  },
  slaContent: {
    flex: 1,
  },
  slaLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  slaValue: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#2563EB",
  },
  slaValueOverdue: {
    color: "#DC2626",
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
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#111827",
  },
  siteInfo: {
    marginBottom: 12,
  },
  siteName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#6B7280",
    marginBottom: 4,
  },
  siteCode: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#111827",
    marginBottom: 4,
  },
  siteLocation: {
    fontSize: 14,
    color: "#6B7280",
  },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
  },
  mapButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#2563EB",
  },
  helpText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  assignButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: "#2563EB",
    borderRadius: 8,
  },
  assignButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  arrivalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: "#2563EB",
    borderRadius: 8,
  },
  arrivalButtonDisabled: {
    opacity: 0.5,
  },
  arrivalButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#111827",
    flex: 1,
  },
  neutralizeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: "#16A34A",
    borderRadius: 8,
    marginTop: 8,
  },
  neutralizeButtonDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.5,
  },
  neutralizeButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  evidenceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  evidenceItem: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  evidenceItemComplete: {
    backgroundColor: "#D1FAE5",
    borderColor: "#86EFAC",
  },
  evidenceLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#111827",
    marginTop: 8,
    textAlign: "center",
  },
  captureButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
  },
  captureButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#2563EB",
  },
  validateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: "#16A34A",
    borderRadius: 8,
    marginTop: 12,
  },
  validateButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  closeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: "#7C3AED",
    borderRadius: 8,
    marginTop: 12,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#DC2626",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#F9FAFB",
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#DC2626",
    marginTop: 16,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#2563EB",
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#111827",
  },
  modalClose: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#2563EB",
  },
  completedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    backgroundColor: "#D1FAE5",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#16A34A",
    marginBottom: 20,
  },
  completedContent: {
    flex: 1,
  },
  completedTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#16A34A",
    marginBottom: 6,
  },
  completedTime: {
    fontSize: 14,
    color: "#15803D",
    fontWeight: "500" as const,
  },
  crewList: {
    flex: 1,
    padding: 16,
  },
  crewCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },
  crewCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  crewName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#111827",
    flex: 1,
  },
  crewTypeBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  crewTypeText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#2563EB",
  },
  crewCardDetails: {
    gap: 6,
  },
  crewDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  crewLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500" as const,
  },
  crewValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600" as const,
  },
  crewZone: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  crewStatus: {
    fontSize: 14,
    color: "#6B7280",
  },
  crewSearchContainer: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  crewSearchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  crewSearchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
  },
  filterInfo: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#BFDBFE",
  },
  filterInfoText: {
    fontSize: 14,
    color: "#2563EB",
    fontWeight: "600" as const,
  },
  emptyCrewState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyCrewText: {
    fontSize: 16,
    color: "#9CA3AF",
    marginTop: 12,
    textAlign: "center",
  },
  rejectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 2,
    borderColor: "#DC2626",
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#DC2626",
  },
});
