import { AlertCircle, CheckCircle, Clock, RefreshCw, Image as ImageIcon, FileText, XCircle, Shield, Check, X, Activity, Database } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import SafeImage from "@/src/components/SafeImage";
import { useAppStore } from "@/store/useAppStore";
import { probeSchema } from "@/services/health";

export default function SyncScreen() {
  const { 
    syncQueue, 
    lastSyncAt, 
    isOnline, 
    processSyncQueue,
    tickets,
    evidenceBundles,
    evidenceItems,
    getEvidenceItemsByBundleId,
    updateEvidenceBundle,
    currentUser,
    hsePermits,
    updateHSEPermit,
    addToSyncQueue,
  } = useAppStore();
  const [syncing, setSyncing] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<string | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);


  const pendingValidation = evidenceBundles.filter(
    (bundle) => !bundle.valid && evidenceItems.some((item) => item.bundleId === bundle.id)
  );

  const pendingHSEPermits = hsePermits.filter((p) => p.status === "pendiente");



  const handleSync = async () => {
    setSyncing(true);
    await processSyncQueue();
    setSyncing(false);
  };



  const handleDiagnostics = async () => {
    setDiagnosing(true);
    try {
      console.log('[Sync] Running network diagnostics...');
      const results = await probeSchema();
      
      const allOk = Object.values(results).every(r => r.ok);
      
      if (allOk) {
        Alert.alert(
          "\u2705 Conexi\u00f3n exitosa",
          `Todas las tablas son accesibles:\n\n` +
          Object.entries(results).map(([table, result]) => 
            `\u2022 ${table}: ${result.count} registros`
          ).join('\n'),
          [{ text: "OK" }]
        );
      } else {
        const failedTables = Object.entries(results)
          .filter(([_, result]) => !result.ok)
          .map(([table, result]) => `\u2022 ${table}: ${typeof result.error === 'string' ? result.error : result.error?.message || 'Error desconocido'}`)
          .join('\n\n');
        
        Alert.alert(
          "\u26a0\ufe0f Problemas de conexi\u00f3n",
          `No se pudo acceder a algunas tablas:\n\n${failedTables}\n\nRevisa la consola para m\u00e1s detalles.`,
          [{ text: "OK" }]
        );
      }
    } catch (error: any) {
      console.error('[Sync] Diagnostic error:', error);
      Alert.alert(
        "\u274c Error de red",
        `No se pudo conectar con Supabase:\n\n${error?.message || 'Error desconocido'}\n\nPosibles causas:\n\u2022 Sin conexi\u00f3n a internet\n\u2022 Supabase no disponible\n\u2022 Firewall/proxy bloqueando`,
        [{ text: "OK" }]
      );
    } finally {
      setDiagnosing(false);
    }
  };



  const handleValidateBundle = async (bundleId: string) => {
    const bundle = evidenceBundles.find((b) => b.id === bundleId);
    const items = getEvidenceItemsByBundleId(bundleId);
    const ticket = tickets.find((t) => t.id === bundle?.ticketId);

    if (!bundle || !ticket) return;

    const photoBefore = items.find((item) => item.type === "photo_before");
    const photoAfter = items.find((item) => item.type === "photo_after");
    const checklist = items.find((item) => item.type === "checklist");

    const missingItems = [];
    if (!photoBefore) missingItems.push("Foto ANTES");
    if (!photoAfter) missingItems.push("Foto DESPUÉS");
    if (!checklist) missingItems.push("Checklist");

    if (missingItems.length > 0) {
      Alert.alert(
        "Evidencia incompleta",
        `Faltan: ${missingItems.join(", ")}`,
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert(
      "Aprobar evidencia",
      `¿Aprobar evidencia del ticket ${ticket.itsmRef || ticket.id}? Esto cerrar\u00e1 el ticket autom\u00e1ticamente.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Aprobar",
          onPress: async () => {
            try {
              updateEvidenceBundle(bundleId, {
                valid: true,
                validatedAt: new Date(),
                validatorUserId: currentUser?.id || "system",
              });
              
              const { getTicketById: getTicketByIdFromDB, updateTicket: updateTicketInDB } = await import("@/services/tickets");
              const store = useAppStore.getState();
              const now = new Date();
              
              store.updateTicket(ticket.id, {
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
              
              Alert.alert("Éxito", "Evidencia aprobada y ticket cerrado autom\u00e1ticamente");
              setSelectedBundle(null);
            } catch (error) {
              console.error("[Sync] Error al aprobar evidencia:", error);
              Alert.alert("Error", "No se pudo aprobar la evidencia");
            }
          },
        },
      ]
    );
  };

  const handleRejectBundle = async (bundleId: string) => {
    const bundle = evidenceBundles.find((b) => b.id === bundleId);
    const ticket = tickets.find((t) => t.id === bundle?.ticketId);
    
    if (!bundle || !ticket) return;
    
    Alert.alert(
      "Rechazar evidencia",
      "¿Est\u00e1s seguro de rechazar esta evidencia? El ticket regresar\u00e1 al estado NEUTRALIZAR para que se vuelva a subir la evidencia.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Rechazar",
          style: "destructive",
          onPress: async () => {
            try {
              updateEvidenceBundle(bundleId, {
                valid: false,
                validatedAt: null,
                validatorUserId: null,
              });
              
              const { getTicketById: getTicketByIdFromDB, updateTicket: updateTicketInDB } = await import("@/services/tickets");
              const store = useAppStore.getState();
              
              store.updateTicket(ticket.id, {
                status: "neutralizar",
                neutralizedAt: ticket.neutralizedAt,
              });
              
              const ticketDB = await getTicketByIdFromDB(ticket.id);
              if (ticketDB) {
                await updateTicketInDB(ticketDB.id, { estado: "neutralizar" });
              }
              
              Alert.alert("Rechazado", "La evidencia ha sido rechazada. El ticket ha regresado al estado NEUTRALIZAR.");
              setSelectedBundle(null);
            } catch (error) {
              console.error("[Sync] Error al rechazar evidencia:", error);
              Alert.alert("Error", "No se pudo rechazar la evidencia");
            }
          },
        },
      ]
    );
  };

  const handleApproveHSE = (permitId: string) => {
    const permit = hsePermits.find((p) => p.id === permitId);
    if (!permit) return;

    Alert.alert(
      "Aprobar permiso HSE",
      "¿Confirmas la aprobación de este permiso?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Aprobar",
          onPress: () => {
            const now = new Date();
            updateHSEPermit(permitId, {
              status: "aprobado",
              approvedAt: now,
            });

            addToSyncQueue({
              type: "hse_approve",
              ticketId: permit.ticketId,
              payload: { permitId, approvedAt: now },
            });

            Alert.alert("Éxito", "Permiso HSE aprobado correctamente");
          },
        },
      ]
    );
  };

  const handleRejectHSE = (permitId: string) => {
    const permit = hsePermits.find((p) => p.id === permitId);
    if (!permit) return;

    Alert.alert(
      "Rechazar permiso HSE",
      "¿Confirmas el rechazo de este permiso?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Rechazar",
          style: "destructive",
          onPress: () => {
            updateHSEPermit(permitId, {
              status: "rechazado",
            });

            addToSyncQueue({
              type: "hse_approve",
              ticketId: permit.ticketId,
              payload: { permitId, status: "rechazado" },
            });

            Alert.alert("Permiso rechazado", "El permiso HSE ha sido rechazado");
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusIndicator, isOnline ? styles.statusOnline : styles.statusOffline]} />
            <Text style={styles.statusTitle}>
              {isOnline ? "Conectado" : "Sin conexión"}
            </Text>
          </View>

          {lastSyncAt && (
            <Text style={styles.statusSubtitle}>
              Última sincronización: {new Date(lastSyncAt).toLocaleString("es-PE")}
            </Text>
          )}
        </View>

        <View style={styles.queueCard}>
          <View style={styles.queueHeader}>
            <Clock size={24} color="#2563EB" />
            <Text style={styles.queueTitle}>Cola de sincronización</Text>
          </View>

          <View style={styles.queueCount}>
            <Text style={styles.queueNumber}>{syncQueue.length}</Text>
            <Text style={styles.queueLabel}>operaciones pendientes</Text>
          </View>

          {syncQueue.length > 0 && (
            <View style={styles.queueList}>
              {syncQueue.map((item) => (
                <View key={item.id} style={styles.queueItem}>
                  <View style={styles.queueItemHeader}>
                    <Text style={styles.queueItemType}>
                      {item.type.replace("_", " ").toUpperCase()}
                    </Text>
                    {item.retries > 0 && (
                      <View style={styles.retryBadge}>
                        <Text style={styles.retryText}>Reintento {item.retries}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.queueItemTicket}>Ticket: {item.ticketId}</Text>
                  {item.lastError && (
                    <Text style={styles.queueItemError} numberOfLines={2}>
                      Error: {item.lastError}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {syncQueue.length === 0 && (
            <View style={styles.emptyQueue}>
              <CheckCircle size={48} color="#16A34A" />
              <Text style={styles.emptyQueueText}>
                No hay operaciones pendientes
              </Text>
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.syncButton, (!isOnline || syncing) && styles.syncButtonDisabled]}
            onPress={handleSync}
            disabled={!isOnline || syncing}
          >
            {syncing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <RefreshCw size={20} color="#FFFFFF" />
                <Text style={styles.syncButtonText}>Sincronizar cola</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.diagnosticButton, diagnosing && styles.diagnosticButtonDisabled]}
            onPress={handleDiagnostics}
            disabled={diagnosing}
          >
            {diagnosing ? (
              <ActivityIndicator color="#2563EB" />
            ) : (
              <>
                <Activity size={20} color="#2563EB" />
                <Text style={styles.diagnosticButtonText}>Diagn\u00f3stico</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.autoSyncInfo}>
          <Database size={20} color="#16A34A" />
          <View style={styles.autoSyncInfoContent}>
            <Text style={styles.autoSyncInfoTitle}>✅ Sincronización automática activa</Text>
            <Text style={styles.autoSyncInfoText}>
              La app se sincroniza automáticamente cada 30 segundos y cuando hay cambios en la base de datos.
            </Text>
          </View>
        </View>

        {!isOnline && (
          <View style={styles.offlineNotice}>
            <AlertCircle size={20} color="#EA580C" />
            <Text style={styles.offlineNoticeText}>
              Sin conexión. Las operaciones se sincronizarán automáticamente al reconectar.
            </Text>
          </View>
        )}

        <View style={styles.validationCard}>
          <View style={styles.validationHeader}>
            <FileText size={24} color="#2563EB" />
            <Text style={styles.validationTitle}>Validación de evidencia</Text>
          </View>

          <View style={styles.validationCount}>
            <Text style={styles.validationNumber}>{pendingValidation.length}</Text>
            <Text style={styles.validationLabel}>evidencias pendientes de validación</Text>
          </View>

          {pendingValidation.length > 0 && (
            <View style={styles.validationList}>
              {pendingValidation.map((bundle) => {
                const ticket = tickets.find((t) => t.id === bundle.ticketId);
                const items = getEvidenceItemsByBundleId(bundle.id);
                const photoBefore = items.find((item) => item.type === "photo_before");
                const photoAfter = items.find((item) => item.type === "photo_after");
                const checklist = items.find((item) => item.type === "checklist");

                return (
                  <View key={bundle.id} style={styles.validationItem}>
                    <View style={styles.validationItemHeader}>
                      <Text style={styles.validationItemTicket}>
                        Ticket: {ticket?.itsmRef || ticket?.id}
                      </Text>
                    </View>

                    <View style={styles.evidencePreview}>
                      <View style={styles.evidencePreviewItem}>
                        {photoBefore ? (
                          <CheckCircle size={20} color="#16A34A" />
                        ) : (
                          <XCircle size={20} color="#DC2626" />
                        )}
                        <Text style={styles.evidencePreviewText}>Foto ANTES</Text>
                      </View>

                      <View style={styles.evidencePreviewItem}>
                        {photoAfter ? (
                          <CheckCircle size={20} color="#16A34A" />
                        ) : (
                          <XCircle size={20} color="#DC2626" />
                        )}
                        <Text style={styles.evidencePreviewText}>Foto DESPUÉS</Text>
                      </View>

                      <View style={styles.evidencePreviewItem}>
                        {checklist ? (
                          <CheckCircle size={20} color="#16A34A" />
                        ) : (
                          <XCircle size={20} color="#DC2626" />
                        )}
                        <Text style={styles.evidencePreviewText}>Checklist</Text>
                      </View>
                    </View>

                    {selectedBundle === bundle.id && (
                      <View style={styles.evidenceDetails}>
                        {photoBefore && (
                          <View style={styles.evidenceDetailItem}>
                            <Text style={styles.evidenceDetailLabel}>Foto ANTES:</Text>
                            <SafeImage
                              uri={photoBefore.url}
                              style={styles.evidenceImage}
                              resizeMode="cover"
                            />
                          </View>
                        )}

                        {photoAfter && (
                          <View style={styles.evidenceDetailItem}>
                            <Text style={styles.evidenceDetailLabel}>Foto DESPUÉS:</Text>
                            <SafeImage
                              uri={photoAfter.url}
                              style={styles.evidenceImage}
                              resizeMode="cover"
                            />
                          </View>
                        )}

                        {checklist && checklist.checklist && (
                          <View style={styles.evidenceDetailItem}>
                            <Text style={styles.evidenceDetailLabel}>Checklist:</Text>
                            <View style={styles.checklistDetails}>
                              <Text style={styles.checklistItem}>
                                <Text style={styles.checklistItemLabel}>Tipo de falla: </Text>
                                {checklist.checklist.tipo_falla}
                              </Text>
                              <Text style={styles.checklistItem}>
                                <Text style={styles.checklistItemLabel}>Acción realizada: </Text>
                                {checklist.checklist.accion_realizada}
                              </Text>
                              <Text style={styles.checklistItem}>
                                <Text style={styles.checklistItemLabel}>Repuestos: </Text>
                                {checklist.checklist.repuestos_usados.join(", ")}
                              </Text>
                              <Text style={styles.checklistItem}>
                                <Text style={styles.checklistItemLabel}>Pruebas: </Text>
                                {checklist.checklist.pruebas_post}
                              </Text>
                              <Text style={styles.checklistItem}>
                                <Text style={styles.checklistItemLabel}>Observaciones: </Text>
                                {checklist.checklist.observaciones}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>
                    )}

                    <View style={styles.validationActions}>
                      <TouchableOpacity
                        style={styles.viewButton}
                        onPress={() =>
                          setSelectedBundle(selectedBundle === bundle.id ? null : bundle.id)
                        }
                      >
                        <ImageIcon size={16} color="#2563EB" />
                        <Text style={styles.viewButtonText}>
                          {selectedBundle === bundle.id ? "Ocultar" : "Ver detalles"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() => handleRejectBundle(bundle.id)}
                      >
                        <XCircle size={16} color="#DC2626" />
                        <Text style={styles.rejectButtonText}>Rechazar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.validateButton}
                        onPress={() => handleValidateBundle(bundle.id)}
                      >
                        <CheckCircle size={16} color="#FFFFFF" />
                        <Text style={styles.validateButtonText}>Validar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {pendingValidation.length === 0 && (
            <View style={styles.emptyValidation}>
              <CheckCircle size={48} color="#16A34A" />
              <Text style={styles.emptyValidationText}>
                No hay evidencias pendientes de validación
              </Text>
            </View>
          )}
        </View>

        <View style={styles.hseCard}>
          <View style={styles.hseHeader}>
            <Shield size={24} color="#2563EB" />
            <Text style={styles.hseTitle}>Validación de permisos HSE</Text>
          </View>

          <View style={styles.hseCount}>
            <Text style={styles.hseNumber}>{pendingHSEPermits.length}</Text>
            <Text style={styles.hseLabel}>permisos HSE pendientes de validación</Text>
          </View>

          {pendingHSEPermits.length > 0 && (
            <View style={styles.hseList}>
              {pendingHSEPermits.map((permit) => {
                const ticket = tickets.find((t) => t.id === permit.ticketId);
                const HSE_TYPE_LABELS: Record<string, string> = {
                  electrico: "Eléctrico",
                  altura: "Trabajo en altura",
                  GE: "Generador eléctrico",
                  fibra: "Fibra óptica",
                };

                return (
                  <View key={permit.id} style={styles.hseItem}>
                    <View style={styles.hseItemHeader}>
                      <Text style={styles.hseItemType}>
                        {HSE_TYPE_LABELS[permit.type] || permit.type}
                      </Text>
                      <Text style={styles.hseItemDate}>
                        {new Date(permit.issuedAt).toLocaleDateString("es-PE")}
                      </Text>
                    </View>

                    {ticket && (
                      <Text style={styles.hseItemTicket}>
                        Ticket: {ticket.itsmRef || ticket.id}
                      </Text>
                    )}

                    <View style={styles.hseActions}>
                      <TouchableOpacity
                        style={styles.hseRejectButton}
                        onPress={() => handleRejectHSE(permit.id)}
                      >
                        <X size={16} color="#DC2626" />
                        <Text style={styles.hseRejectButtonText}>Rechazar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.hseApproveButton}
                        onPress={() => handleApproveHSE(permit.id)}
                      >
                        <Check size={16} color="#FFFFFF" />
                        <Text style={styles.hseApproveButtonText}>Aprobar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {pendingHSEPermits.length === 0 && (
            <View style={styles.emptyHSE}>
              <CheckCircle size={48} color="#16A34A" />
              <Text style={styles.emptyHSEText}>
                No hay permisos HSE pendientes de validación
              </Text>
            </View>
          )}
        </View>


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
  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusOnline: {
    backgroundColor: "#16A34A",
  },
  statusOffline: {
    backgroundColor: "#DC2626",
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#111827",
  },
  statusSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 24,
  },
  queueCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  queueHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  queueTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#111827",
  },
  queueCount: {
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  queueNumber: {
    fontSize: 48,
    fontWeight: "700" as const,
    color: "#2563EB",
  },
  queueLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  queueList: {
    marginTop: 16,
    gap: 12,
  },
  queueItem: {
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  queueItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  queueItemType: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#111827",
  },
  retryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#FEF3C7",
    borderRadius: 4,
  },
  retryText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#CA8A04",
  },
  queueItemTicket: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  queueItemError: {
    fontSize: 12,
    color: "#DC2626",
  },
  emptyQueue: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyQueueText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#16A34A",
    marginTop: 12,
  },
  syncButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  syncButtonDisabled: {
    opacity: 0.5,
  },
  syncButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600" as const,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  diagnosticButton: {
    flex: 1,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: "#2563EB",
  },
  diagnosticButtonDisabled: {
    opacity: 0.5,
  },
  diagnosticButtonText: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "600" as const,
  },
  autoSyncInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#86EFAC",
    marginBottom: 16,
  },
  autoSyncInfoContent: {
    flex: 1,
  },
  autoSyncInfoTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#166534",
    marginBottom: 4,
  },
  autoSyncInfoText: {
    fontSize: 14,
    color: "#15803D",
    lineHeight: 20,
  },

  offlineNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#FFEDD5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDBA74",
  },
  offlineNoticeText: {
    flex: 1,
    fontSize: 14,
    color: "#9A3412",
  },
  validationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  validationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  validationTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#111827",
  },
  validationCount: {
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  validationNumber: {
    fontSize: 48,
    fontWeight: "700" as const,
    color: "#2563EB",
  },
  validationLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  validationList: {
    marginTop: 16,
    gap: 12,
  },
  validationItem: {
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  validationItemHeader: {
    marginBottom: 12,
  },
  validationItemTicket: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#111827",
  },
  evidencePreview: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  evidencePreviewItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  evidencePreviewText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#6B7280",
  },
  evidenceDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 16,
  },
  evidenceDetailItem: {
    gap: 8,
  },
  evidenceDetailLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#111827",
  },
  evidenceImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  checklistDetails: {
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  checklistItem: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 20,
  },
  checklistItemLabel: {
    fontWeight: "600" as const,
    color: "#111827",
  },
  validationActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  viewButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: 6,
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#2563EB",
  },
  rejectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#FEE2E2",
    borderRadius: 6,
  },
  rejectButtonText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#DC2626",
  },
  validateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#16A34A",
    borderRadius: 6,
  },
  validateButtonText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  emptyValidation: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyValidationText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#16A34A",
    marginTop: 12,
  },
  hseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  hseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  hseTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#111827",
  },
  hseCount: {
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  hseNumber: {
    fontSize: 48,
    fontWeight: "700" as const,
    color: "#2563EB",
  },
  hseLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  hseList: {
    marginTop: 16,
    gap: 12,
  },
  hseItem: {
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  hseItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  hseItemType: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#111827",
  },
  hseItemDate: {
    fontSize: 12,
    color: "#6B7280",
  },
  hseItemTicket: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
  },
  hseActions: {
    flexDirection: "row",
    gap: 8,
  },
  hseRejectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: "#FEE2E2",
    borderRadius: 6,
  },
  hseRejectButtonText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#DC2626",
  },
  hseApproveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: "#16A34A",
    borderRadius: 6,
  },
  hseApproveButtonText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  emptyHSE: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyHSEText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#16A34A",
    marginTop: 12,
  },
});
