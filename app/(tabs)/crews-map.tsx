import { MapPin, Users, Activity, XCircle } from "lucide-react-native";
import React, { useState, useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppStore } from "@/store/useAppStore";
import type { Crew } from "@/types";
import { zoneKey } from "@/services/cuadrillas";

const STATUS_COLORS = {
  disponible: { bg: "#D1FAE5", text: "#16A34A", border: "#86EFAC" },
  ocupado: { bg: "#FEF3C7", text: "#CA8A04", border: "#FDE047" },
  fuera_servicio: { bg: "#FEE2E2", text: "#DC2626", border: "#FCA5A5" },
};

const STATUS_LABELS = {
  disponible: "Disponible",
  ocupado: "Ocupado",
  fuera_servicio: "Fuera de servicio",
};

export default function CrewsMapScreen() {
  const { crews, currentUser } = useAppStore();
  const [selectedCrew, setSelectedCrew] = useState<Crew | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | "ALL">("ALL");
  const [selectedZone, setSelectedZone] = useState<string | "ALL">("ALL");

  const filteredCrews = useMemo(() => {
    let filtered = crews;
    
    if (selectedZone !== "ALL") {
      filtered = filtered.filter((c) => zoneKey(c.zone) === selectedZone);
    }
    
    if (selectedStatus !== "ALL") {
      filtered = filtered.filter((c) => c.status === selectedStatus);
    }
    
    return filtered;
  }, [crews, selectedStatus, selectedZone]);

  const zoneCounts = useMemo(() => {
    const counts = { LIMA: 0, NORTE: 0, CENTRO: 0, SUR: 0 };
    crews.forEach(c => {
      const key = zoneKey(c.zone);
      if (key in counts) {
        counts[key as keyof typeof counts]++;
      }
    });
    return counts;
  }, [crews]);



  if (!currentUser || currentUser.userType !== "oficina") {
    return (
      <View style={styles.emptyContainer}>
        <MapPin size={48} color="#9CA3AF" />
        <Text style={styles.emptyText}>
          Solo usuarios de Oficina pueden ver este mapa
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedStatus === "ALL" && styles.filterChipActive,
          ]}
          onPress={() => setSelectedStatus("ALL")}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedStatus === "ALL" && styles.filterChipTextActive,
            ]}
          >
            Todas ({crews.length})
          </Text>
        </TouchableOpacity>

        {(["disponible", "ocupado", "fuera_servicio"] as const).map((status) => {
          const count = crews.filter((c) => c.status === status).length;
          const colors = STATUS_COLORS[status];

          return (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                selectedStatus === status && {
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setSelectedStatus(status)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedStatus === status && { color: colors.text },
                ]}
              >
                {STATUS_LABELS[status]} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.zoneContainer}
        contentContainerStyle={styles.zoneContent}
      >
        <TouchableOpacity
          style={[
            styles.zoneChip,
            selectedZone === "ALL" && styles.zoneChipActive,
          ]}
          onPress={() => setSelectedZone("ALL")}
        >
          <MapPin size={16} color={selectedZone === "ALL" ? "#FFFFFF" : "#6B7280"} />
          <Text
            style={[
              styles.zoneChipText,
              selectedZone === "ALL" && styles.zoneChipTextActive,
            ]}
          >
            Todas las Zonas
          </Text>
        </TouchableOpacity>

        {(["LIMA", "NORTE", "CENTRO", "SUR"] as const).map((zone) => {
          return (
            <TouchableOpacity
              key={zone}
              style={[
                styles.zoneChip,
                selectedZone === zone && styles.zoneChipActive,
              ]}
              onPress={() => setSelectedZone(zone)}
            >
              <MapPin size={16} color={selectedZone === zone ? "#FFFFFF" : "#6B7280"} />
              <Text
                style={[
                  styles.zoneChipText,
                  selectedZone === zone && styles.zoneChipTextActive,
                ]}
              >
                {zone} ({zoneCounts[zone]})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {selectedCrew && (
        <View style={styles.detailsCard}>
          <View style={styles.detailsHeader}>
            <Text style={styles.detailsTitle}>{selectedCrew.name}</Text>
            <TouchableOpacity onPress={() => setSelectedCrew(null)}>
              <XCircle size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.detailsContent}>
            <View style={styles.detailRow}>
              <Users size={16} color="#6B7280" />
              <Text style={styles.detailLabel}>Miembros:</Text>
              <Text style={styles.detailValue}>{selectedCrew.members.join(", ")}</Text>
            </View>

            <View style={styles.detailRow}>
              <MapPin size={16} color="#6B7280" />
              <Text style={styles.detailLabel}>Zona:</Text>
              <Text style={styles.detailValue}>{selectedCrew.zone}</Text>
            </View>

            <View style={styles.detailRow}>
              <Activity size={16} color="#6B7280" />
              <Text style={styles.detailLabel}>Estado:</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: STATUS_COLORS[selectedCrew.status].bg,
                    borderColor: STATUS_COLORS[selectedCrew.status].border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: STATUS_COLORS[selectedCrew.status].text },
                  ]}
                >
                  {STATUS_LABELS[selectedCrew.status]}
                </Text>
              </View>
            </View>

            {selectedCrew.department && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Departamento:</Text>
                <Text style={styles.detailValue}>{selectedCrew.department}</Text>
              </View>
            )}

            {selectedCrew.base && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Base:</Text>
                <Text style={styles.detailValue}>{selectedCrew.base}</Text>
              </View>
            )}

            {selectedCrew.skills && selectedCrew.skills.length > 0 && (
              <View style={styles.skillsContainer}>
                <Text style={styles.detailLabel}>Skills:</Text>
                <View style={styles.skillsList}>
                  {selectedCrew.skills.map((skill, idx) => (
                    <View key={`skill-${selectedCrew.id}-${idx}-${skill}`} style={styles.skillChip}>
                      <Text style={styles.skillText}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {selectedCrew.lastLocationUpdate && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Ultima actualizacion:</Text>
                <Text style={styles.detailValue}>
                  {String(new Date(selectedCrew.lastLocationUpdate).toLocaleString("es-PE"))}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      <ScrollView style={styles.crewsList}>
        {filteredCrews.map((crew) => {
          const colors = STATUS_COLORS[crew.status];

          return (
            <TouchableOpacity
              key={crew.id}
              style={[
                styles.crewCard,
                selectedCrew?.id === crew.id && styles.crewCardSelected,
              ]}
              onPress={() => setSelectedCrew(crew)}
            >
              <View style={styles.crewHeader}>
                <Text style={styles.crewName}>{crew.name}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: colors.bg, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.statusText, { color: colors.text }]}>
                    {STATUS_LABELS[crew.status]}
                  </Text>
                </View>
              </View>

              <Text style={styles.crewMembers}>{crew.members.join(", ")}</Text>

              <View style={styles.crewFooter}>
                <MapPin size={14} color="#6B7280" />
                <Text style={styles.crewZone}>{crew.zone}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  filterContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  zoneContainer: {
    backgroundColor: "#F3F4F6",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  zoneContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  zoneChip: {
    flexDirection: "row" as const,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 6,
  },
  zoneChipActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  zoneChipText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#6B7280",
  },
  zoneChipTextActive: {
    color: "#FFFFFF",
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#6B7280",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },

  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    padding: 16,
  },
  detailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#111827",
  },
  detailsContent: {
    gap: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#6B7280",
  },
  detailValue: {
    fontSize: 14,
    color: "#111827",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600" as const,
  },
  crewsList: {
    flex: 1,
    padding: 16,
  },
  crewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  crewCardSelected: {
    borderColor: "#2563EB",
    borderWidth: 2,
  },
  crewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  crewName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#111827",
  },
  crewMembers: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  crewFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  crewZone: {
    fontSize: 14,
    color: "#6B7280",
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
    textAlign: "center",
  },
  skillsContainer: {
    gap: 8,
  },
  skillsList: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
    marginTop: 4,
  },
  skillChip: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  skillText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#4F46E5",
  },
});
