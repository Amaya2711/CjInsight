import React, { useState, useMemo, useEffect } from "react";
import { StyleSheet, View, Text, Platform, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppStore } from "@/store/useAppStore";
import { MapPin, Search, X } from "lucide-react-native";
import FullMapView from "@/src/components/FullMapView";
import { Stack } from "expo-router";
import { listSites, mapSiteToApp, getSitesTotalCount } from "@/services/sites";
import { listCuadrillas, toLatLng, zoneKey, type CuadrillaDB } from "@/services/cuadrillas";
import type { Site, Crew } from "@/types";

export default function FullMapScreen() {
  const { currentUser } = useAppStore();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [allSites, setAllSites] = useState<Site[]>([]);
  const [allCrews, setAllCrews] = useState<Crew[]>([]);
  const [totalSitesCount, setTotalSitesCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<"ALL"|"LIMA"|"NORTE"|"CENTRO"|"SUR">("ALL");

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      console.log('[FullMap] 🗺️ Cargando sites y cuadrillas...');
      
      const totalCount = await getSitesTotalCount();
      setTotalSitesCount(totalCount);
      console.log(`[FullMap] 📊 Total sites en BD: ${totalCount}`);
      
      
      let allSitesData: Site[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const result = await listSites({ page, pageSize });
        if (result.error) {
          console.error('[FullMap] Error loading sites page', page, ':', result.error);
          break;
        }
        if (result.data && result.data.length > 0) {
          const mapped = result.data.map(mapSiteToApp);
          allSitesData = [...allSitesData, ...mapped];
          console.log(`[FullMap] 📍 Página ${page + 1}: +${mapped.length} sites (total acumulado: ${allSitesData.length})`);
          
          if (result.data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }
      
      const withLocation = allSitesData.filter(s => s.lat && s.lng && s.lat !== 0 && s.lng !== 0);
      setAllSites(withLocation);
      console.log(`[FullMap] ✅ Cargados ${withLocation.length} sites con ubicación de ${allSitesData.length} totales`);
      console.log('[FullMap] 📋 Muestra de 5 sites:', 
        withLocation.slice(0, 5).map(s => ({
          id: s.id,
          name: s.name,
          siteCode: s.siteCode,
          lat: s.lat,
          lng: s.lng
        }))
      );

      const cuadrillasResult = await listCuadrillas();
      console.log(`[FullMap] 🚚 Procesando ${cuadrillasResult.length} cuadrillas...`);
      console.log('[FullMap] 🔍 Muestra de 3 cuadrillas:', 
        cuadrillasResult.slice(0, 3).map((r: CuadrillaDB) => ({
          id: r.id,
          nombre: r.nombre,
          latitud: r.latitud,
          longitud: r.longitud
        }))
      );
      
      const crewsWithLocation = cuadrillasResult
        .map((db: CuadrillaDB) => {
            const ll = toLatLng(db);
            if (!ll) return null;
            return {
              id: String(db.id),
              name: db.nombre,
              status: 'disponible' as const,
              zone: db.zona,
              currentLocation: { lat: ll.latitude, lng: ll.longitude },
              members: [],
              email: '',
              lastLocationUpdate: null,
              coverageAreas: [],
              assignedTicketIds: [],
              inventory: [],
              interzonal: false,
              workload: { openAssignedTickets: 0 },
            } as Crew;
          })
          .filter(Boolean) as Crew[];
        
      setAllCrews(crewsWithLocation);
      console.log(`[FullMap] ✅ ${crewsWithLocation.length} cuadrillas con ubicación válida de ${cuadrillasResult.length} totales`);
      console.log('[FullMap] 📋 Muestra de 3 cuadrillas con ubicación:', 
        crewsWithLocation.slice(0, 3).map(c => ({
          id: c.id,
          name: c.name,
          location: c.currentLocation
        }))
      );
    } catch (error) {
      console.error('[FullMap] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sitesWithLocation = useMemo(() => {
    return allSites.filter((s) => s.lat && s.lng);
  }, [allSites]);
  
  const crewsWithLocation = useMemo(() => {
    return allCrews.filter((c) => c.currentLocation !== null);
  }, [allCrews]);

  const filteredSites = useMemo(() => {
    if (!searchQuery.trim()) return sitesWithLocation;
    const query = searchQuery.toLowerCase();
    return sitesWithLocation.filter((s) => 
      (s.name && String(s.name).toLowerCase().includes(query)) ||
      (s.siteCode && String(s.siteCode).toLowerCase().includes(query)) ||
      (s.tipologia && String(s.tipologia).toLowerCase().includes(query))
    );
  }, [sitesWithLocation, searchQuery]);

  const filteredCrews = useMemo(() => {
    let filtered = crewsWithLocation;
    
    if (selectedZone !== "ALL") {
      filtered = filtered.filter((c) => zoneKey(c.zone) === selectedZone);
    }
    
    if (!searchQuery.trim()) return filtered;
    const query = searchQuery.toLowerCase();
    return filtered.filter((c) => 
      (c.name && String(c.name).toLowerCase().includes(query)) ||
      (c.zone && String(c.zone).toLowerCase().includes(query))
    );
  }, [crewsWithLocation, searchQuery, selectedZone]);

  const zoneCounts = useMemo(() => {
    const counts = { LIMA: 0, NORTE: 0, CENTRO: 0, SUR: 0 };
    crewsWithLocation.forEach(c => {
      const key = zoneKey(c.zone);
      if (key in counts) {
        counts[key as keyof typeof counts]++;
      }
    });
    return counts;
  }, [crewsWithLocation]);

  console.log('[FullMap] Verificando permisos...');
  console.log('[FullMap] currentUser:', currentUser);
  console.log('[FullMap] userType:', currentUser?.userType);
  
  if (!currentUser || currentUser.userType !== "oficina") {
    console.warn('[FullMap] ❌ Acceso denegado - currentUser:', JSON.stringify(currentUser, null, 2));
    return (
      <View style={styles.emptyContainer}>
        <MapPin size={48} color="#9CA3AF" />
        <Text style={styles.emptyText}>
          Solo usuarios de Oficina pueden ver este mapa
        </Text>
        <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 8 }}>
          Tipo de usuario actual: {currentUser?.userType || "No definido"}
        </Text>
      </View>
    );
  }
  
  console.log('[FullMap] ✅ Usuario autorizado como oficina');

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Cargando mapa...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
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
            <Text style={styles.counterValue}>{totalSitesCount}</Text>
            <Text style={styles.counterLabel}>Sites</Text>
          </View>
          <View style={styles.counterCard}>
            <MapPin size={20} color="#16A34A" />
            <Text style={styles.counterValue}>{filteredCrews.length}</Text>
            <Text style={styles.counterLabel}>Cuadrillas</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.zoneFilters}
        >
          <TouchableOpacity
            style={[styles.zoneChip, selectedZone === "ALL" && styles.zoneChipActive]}
            onPress={() => setSelectedZone("ALL")}
          >
            <Text style={[styles.zoneChipText, selectedZone === "ALL" && styles.zoneChipTextActive]}>
              Todas ({crewsWithLocation.length})
            </Text>
          </TouchableOpacity>
          {(["LIMA", "NORTE", "CENTRO", "SUR"] as const).map((zone) => (
            <TouchableOpacity
              key={zone}
              style={[styles.zoneChip, selectedZone === zone && styles.zoneChipActive]}
              onPress={() => setSelectedZone(zone)}
            >
              <Text style={[styles.zoneChipText, selectedZone === zone && styles.zoneChipTextActive]}>
                {zone} ({zoneCounts[zone]})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
  zoneFilters: {
    maxHeight: 50,
  },
  zoneChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8,
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
  },
});
