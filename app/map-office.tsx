import React, { useState, useMemo } from "react";
import { StyleSheet, View, Text, Platform, TextInput, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppStore } from "@/store/useAppStore";
import { MapPin, Search, X } from "lucide-react-native";
import FullMapView from "@/src/components/FullMapView";

export default function MapOfficeScreen() {
  const { sites, crews, currentUser } = useAppStore();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");

  const sitesWithLocation = useMemo(() => {
    return sites.filter((s) => s.lat && s.lng);
  }, [sites]);
  
  const crewsWithLocation = useMemo(() => {
    return crews.filter((c) => c.currentLocation !== null);
  }, [crews]);

  const filteredSites = useMemo(() => {
    if (!searchQuery.trim()) return sitesWithLocation;
    const query = searchQuery.toLowerCase();
    return sitesWithLocation.filter((s) => 
      s.name.toLowerCase().includes(query) ||
      s.siteCode.toLowerCase().includes(query) ||
      (s.tipologia && s.tipologia.toLowerCase().includes(query))
    );
  }, [sitesWithLocation, searchQuery]);

  const filteredCrews = useMemo(() => {
    if (!searchQuery.trim()) return crewsWithLocation;
    const query = searchQuery.toLowerCase();
    return crewsWithLocation.filter((c) => 
      c.name.toLowerCase().includes(query) ||
      c.zone.toLowerCase().includes(query)
    );
  }, [crewsWithLocation, searchQuery]);

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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mapa Completo</Text>
        
        <View style={styles.searchContainer}>
          <Search size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar sites o cuadrillas..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearButton}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.countersContainer}>
          <View style={styles.counterCard}>
            <MapPin size={20} color="#3B82F6" />
            <Text style={styles.counterValue}>{filteredSites.length}</Text>
            <Text style={styles.counterLabel}>Sites</Text>
          </View>
          <View style={styles.counterCard}>
            <MapPin size={20} color="#16A34A" />
            <Text style={styles.counterValue}>{filteredCrews.length}</Text>
            <Text style={styles.counterLabel}>Cuadrillas</Text>
          </View>
        </View>
      </View>
      <View style={styles.mapContainer}>
        <FullMapView
          sites={filteredSites}
          crews={filteredCrews}
          zoom={Platform.OS === 'web' ? 12 : 10}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#111827",
  },
  searchContainer: {
    flexDirection: "row" as const,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  countersContainer: {
    flexDirection: "row" as const,
    gap: 12,
  },
  counterCard: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  counterValue: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#111827",
  },
  counterLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  mapContainer: {
    flex: 1,
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
});
