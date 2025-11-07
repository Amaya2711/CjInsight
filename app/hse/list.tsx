import { router } from "expo-router";
import { AlertCircle, Check, Clock, Shield, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppStore } from "@/store/useAppStore";
import type { HSEPermit, HSEPermitStatus } from "@/types";

const HSE_TYPE_LABELS: Record<string, string> = {
  electrico: "Eléctrico",
  altura: "Trabajo en altura",
  GE: "Generador eléctrico",
  fibra: "Fibra óptica",
};

const STATUS_COLORS: Record<HSEPermitStatus, { bg: string; text: string; border: string }> = {
  pendiente: { bg: "#FFEDD5", text: "#EA580C", border: "#FDBA74" },
  aprobado: { bg: "#D1FAE5", text: "#16A34A", border: "#86EFAC" },
  rechazado: { bg: "#FEE2E2", text: "#DC2626", border: "#FCA5A5" },
};

export default function HSEListScreen() {
  const { hsePermits, updateHSEPermit, getTicketById, addToSyncQueue, currentUser } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleApprove = (permit: HSEPermit) => {
    Alert.alert(
      "Aprobar permiso HSE",
      `¿Confirmas la aprobación del permiso ${HSE_TYPE_LABELS[permit.type]}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Aprobar",
          style: "default",
          onPress: () => {
            const now = new Date();
            updateHSEPermit(permit.id, {
              status: "aprobado",
              approvedAt: now,
            });

            addToSyncQueue({
              type: "hse_approve",
              ticketId: permit.ticketId,
              payload: { permitId: permit.id, approvedAt: now },
            });

            Alert.alert("Éxito", "Permiso HSE aprobado correctamente");
          },
        },
      ]
    );
  };

  const handleReject = (permit: HSEPermit) => {
    Alert.alert(
      "Rechazar permiso HSE",
      `¿Confirmas el rechazo del permiso ${HSE_TYPE_LABELS[permit.type]}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Rechazar",
          style: "destructive",
          onPress: () => {
            updateHSEPermit(permit.id, {
              status: "rechazado",
            });

            addToSyncQueue({
              type: "hse_approve",
              ticketId: permit.ticketId,
              payload: { permitId: permit.id, status: "rechazado" },
            });

            Alert.alert("Permiso rechazado", "El permiso HSE ha sido rechazado");
          },
        },
      ]
    );
  };

  const pendingPermits = hsePermits.filter((p) => p.status === "pendiente");
  const approvedPermits = hsePermits.filter((p) => p.status === "aprobado");
  const rejectedPermits = hsePermits.filter((p) => p.status === "rechazado");

  if (currentUser?.userType === 'campo') {
    return (
      <View style={styles.container}>
        <View style={styles.accessDeniedContainer}>
          <Text style={styles.accessDeniedText}>Acceso denegado</Text>
          <Text style={styles.accessDeniedSubtext}>No tienes permisos para ver esta pantalla</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Shield size={32} color="#2563EB" />
          <Text style={styles.title}>Permisos HSE</Text>
          <Text style={styles.subtitle}>
            Gestiona y aprueba permisos de seguridad para intervenciones
          </Text>
        </View>

        {hsePermits.length === 0 ? (
          <View style={styles.emptyState}>
            <Shield size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No hay permisos HSE</Text>
            <Text style={styles.emptyText}>
              Los permisos solicitados aparecerán aquí para su aprobación
            </Text>
          </View>
        ) : (
          <>
            {pendingPermits.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Clock size={20} color="#EA580C" />
                  <Text style={styles.sectionTitle}>Pendientes ({pendingPermits.length})</Text>
                </View>

                {pendingPermits.map((permit) => {
                  const ticket = getTicketById(permit.ticketId);
                  const colors = STATUS_COLORS[permit.status];

                  return (
                    <View key={permit.id} style={styles.permitCard}>
                      <View style={styles.permitHeader}>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: colors.bg, borderColor: colors.border },
                          ]}
                        >
                          <Text style={[styles.statusText, { color: colors.text }]}>
                            {permit.status.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.permitDate}>
                          {new Date(permit.issuedAt).toLocaleDateString("es-PE")}
                        </Text>
                      </View>

                      <Text style={styles.permitType}>{HSE_TYPE_LABELS[permit.type]}</Text>

                      {ticket && (
                        <TouchableOpacity
                          onPress={() =>
                            router.push({ pathname: "/ticket/[id]", params: { id: ticket.id } })
                          }
                        >
                          <Text style={styles.ticketRef}>
                            Ticket: {ticket.itsmRef || ticket.id}
                          </Text>
                          <Text style={styles.ticketDesc} numberOfLines={2}>
                            {ticket.description}
                          </Text>
                        </TouchableOpacity>
                      )}

                      <View style={styles.permitActions}>
                        <TouchableOpacity
                          style={styles.rejectButton}
                          onPress={() => handleReject(permit)}
                        >
                          <X size={16} color="#DC2626" />
                          <Text style={styles.rejectButtonText}>Rechazar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.approveButton}
                          onPress={() => handleApprove(permit)}
                        >
                          <Check size={16} color="#FFFFFF" />
                          <Text style={styles.approveButtonText}>Aprobar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {approvedPermits.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Check size={20} color="#16A34A" />
                  <Text style={styles.sectionTitle}>Aprobados ({approvedPermits.length})</Text>
                </View>

                {approvedPermits.map((permit) => {
                  const ticket = getTicketById(permit.ticketId);
                  const colors = STATUS_COLORS[permit.status];

                  return (
                    <View key={permit.id} style={styles.permitCard}>
                      <View style={styles.permitHeader}>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: colors.bg, borderColor: colors.border },
                          ]}
                        >
                          <Text style={[styles.statusText, { color: colors.text }]}>
                            {permit.status.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.permitDate}>
                          {permit.approvedAt
                            ? new Date(permit.approvedAt).toLocaleDateString("es-PE")
                            : "-"}
                        </Text>
                      </View>

                      <Text style={styles.permitType}>{HSE_TYPE_LABELS[permit.type]}</Text>

                      {ticket && (
                        <TouchableOpacity
                          onPress={() =>
                            router.push({ pathname: "/ticket/[id]", params: { id: ticket.id } })
                          }
                        >
                          <Text style={styles.ticketRef}>
                            Ticket: {ticket.itsmRef || ticket.id}
                          </Text>
                          <Text style={styles.ticketDesc} numberOfLines={2}>
                            {ticket.description}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {rejectedPermits.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <AlertCircle size={20} color="#DC2626" />
                  <Text style={styles.sectionTitle}>Rechazados ({rejectedPermits.length})</Text>
                </View>

                {rejectedPermits.map((permit) => {
                  const ticket = getTicketById(permit.ticketId);
                  const colors = STATUS_COLORS[permit.status];

                  return (
                    <View key={permit.id} style={styles.permitCard}>
                      <View style={styles.permitHeader}>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: colors.bg, borderColor: colors.border },
                          ]}
                        >
                          <Text style={[styles.statusText, { color: colors.text }]}>
                            {permit.status.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.permitDate}>
                          {new Date(permit.issuedAt).toLocaleDateString("es-PE")}
                        </Text>
                      </View>

                      <Text style={styles.permitType}>{HSE_TYPE_LABELS[permit.type]}</Text>

                      {ticket && (
                        <TouchableOpacity
                          onPress={() =>
                            router.push({ pathname: "/ticket/[id]", params: { id: ticket.id } })
                          }
                        >
                          <Text style={styles.ticketRef}>
                            Ticket: {ticket.itsmRef || ticket.id}
                          </Text>
                          <Text style={styles.ticketDesc} numberOfLines={2}>
                            {ticket.description}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
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
  header: {
    alignItems: "center",
    marginBottom: 24,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#111827",
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
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
  permitCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  permitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700" as const,
  },
  permitDate: {
    fontSize: 12,
    color: "#6B7280",
  },
  permitType: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#111827",
    marginBottom: 8,
  },
  ticketRef: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#2563EB",
    marginBottom: 4,
  },
  ticketDesc: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  permitActions: {
    flexDirection: "row",
    gap: 8,
  },
  rejectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#DC2626",
  },
  approveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: "#16A34A",
    borderRadius: 8,
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  accessDeniedText: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: '#DC2626',
    marginBottom: 8,
  },
  accessDeniedSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
