import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Stack } from "expo-router";
import { Users, Search } from "lucide-react-native";
import { useAppStore } from "@/store/useAppStore";

export default function CuadrillasScreen() {
  const { crews } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedZone, setSelectedZone] = useState<string | "ALL">("ALL");

  const zones = ["LIMA", "NORTE", "CENTRO", "SUR"];

  const filteredCrews = useMemo(() => {
    let filtered = crews;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (crew) =>
          crew.name.toLowerCase().includes(query) ||
          crew.zone.toLowerCase().includes(query) ||
          crew.members.some((member) => member.toLowerCase().includes(query))
      );
    }

    if (selectedZone !== "ALL") {
      filtered = filtered.filter((crew) => crew.zone === selectedZone);
    }

    return filtered;
  }, [crews, searchQuery, selectedZone]);

  const getCrewStatusDisplay = (status: string) => {
    switch (status) {
      case "disponible":
        return "Disponible";
      case "ocupado":
        return "Ocupado";
      case "fuera_servicio":
        return "Fuera de servicio";
      default:
        return status;
    }
  };

  const getCrewStatusColor = (status: string) => {
    switch (status) {
      case "disponible":
        return "#10B981";
      case "ocupado":
        return "#F59E0B";
      case "fuera_servicio":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Cuadrillas",
          headerStyle: {
            backgroundColor: "#2563EB",
          },
          headerTintColor: "#FFFFFF",
        }}
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar cuadrillas..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedZone === "ALL" && styles.filterChipActive,
          ]}
          onPress={() => setSelectedZone("ALL")}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedZone === "ALL" && styles.filterChipTextActive,
            ]}
          >
            Todas las zonas
          </Text>
        </TouchableOpacity>

        {zones.map((zone) => (
          <TouchableOpacity
            key={zone}
            style={[
              styles.filterChip,
              selectedZone === zone && styles.filterChipActive,
            ]}
            onPress={() => setSelectedZone(zone)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedZone === zone && styles.filterChipTextActive,
              ]}
            >
              {zone}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.scrollView}>
        {filteredCrews.map((crew) => {
          const status = getCrewStatusDisplay(crew.status);
          const statusColor = getCrewStatusColor(crew.status);

          return (
            <View key={crew.id} style={styles.crewCard}>
              <View style={styles.crewHeader}>
                <View style={styles.crewTitleRow}>
                  <Users size={20} color="#2563EB" />
                  <Text style={styles.crewName}>{crew.name}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${statusColor}20` },
                  ]}
                >
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {status}
                  </Text>
                </View>
              </View>

              <View style={styles.crewDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Zona:</Text>
                  <Text style={styles.detailValue}>{crew.zone}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tipo:</Text>
                  <Text style={styles.detailValue}>
                    {crew.type || "REGULAR"}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Estado:</Text>
                  <Text style={styles.detailValue}>
                    {crew.status}
                  </Text>
                </View>
                {crew.currentLocation && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Ubicación:</Text>
                    <Text style={styles.detailValue}>
                      {crew.currentLocation.lat.toFixed(6)},{" "}
                      {crew.currentLocation.lng.toFixed(6)}
                    </Text>
                  </View>
                )}
              </View>

              {crew.members && crew.members.length > 0 && (
                <View style={styles.techniciansSection}>
                  <Text style={styles.techniciansTitle}>Miembros:</Text>
                  {crew.members.map((member, index) => (
                    <View key={index} style={styles.technicianItem}>
                      <Text style={styles.technicianName}>{member}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {filteredCrews.length === 0 && (
          <View style={styles.emptyState}>
            <Users size={48} color="#9CA3AF" />
            <Text style={styles.emptyStateText}>
              {searchQuery || selectedZone !== "ALL"
                ? "No se encontraron cuadrillas"
                : "No hay cuadrillas"}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  crewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      },
    }),
  },
  crewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  crewTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  crewName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  crewDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "400",
  },
  techniciansSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  techniciansTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  technicianItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  technicianName: {
    fontSize: 14,
    color: "#374151",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#9CA3AF",
    marginTop: 12,
  },
  searchContainer: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
  },
  filterContainer: {
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
});
