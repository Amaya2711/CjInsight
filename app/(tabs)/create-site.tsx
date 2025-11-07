import { router, Stack } from "expo-router";
import { AlertCircle, ChevronLeft, ChevronRight, MapPin, Plus, Search, X } from "lucide-react-native";
import React, { useState, useMemo, useEffect } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useAppStore } from "@/store/useAppStore";
import { Site } from "@/types";
import { listSites, mapSiteToApp } from "@/services/sites";

export default function SitesListScreen() {
  const { addSite } = useAppStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSite, setNewSite] = useState({
    siteCode: "",
    name: "",
    tipologia: "",
    region: "",
    zona: "",
    departamento: "",
    provincia: "",
    distrito: "",
    address: "",
    lat: "",
    lng: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedZona, setSelectedZona] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalSites, setTotalSites] = useState(0);
  const [paginatedSites, setPaginatedSites] = useState<Site[]>([]);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [regions, setRegions] = useState<string[]>([]);
  const [zonas, setZonas] = useState<string[]>([]);
  const PAGE_SIZE = 100;

  useEffect(() => {
    loadPage(currentPage, searchQuery);
    loadFilters();
  }, [currentPage, searchQuery]);

  const loadFilters = async () => {
    try {
      const result = await listSites({});
      if (result.data) {
        const uniqueRegions = Array.from(new Set(result.data.map((s) => s.region).filter((r): r is string => r != null))).sort();
        const uniqueZonas = Array.from(new Set(result.data.map((s) => s.zona).filter((z): z is string => z != null))).sort();
        setRegions(uniqueRegions);
        setZonas(uniqueZonas);
      }
    } catch (error) {
      console.error('[Sites] Error loading filters:', error);
    }
  };

  const loadPage = async (page: number, search: string) => {
    setIsLoadingPage(true);
    try {
      const result = await listSites({ page, pageSize: PAGE_SIZE, searchQuery: search });
      if (result.error) {
        console.error('[Sites] Error loading page:', result.error);
        return;
      }
      if (result.data) {
        const mapped = result.data.map(mapSiteToApp);
        setPaginatedSites(mapped);
        setTotalSites(result.count || 0);
      }
    } catch (error) {
      console.error('[Sites] Error loading sites:', error);
    } finally {
      setIsLoadingPage(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setCurrentPage(0);
  };

  const handleNextPage = () => {
    const maxPage = Math.ceil(totalSites / PAGE_SIZE) - 1;
    if (currentPage < maxPage) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const totalPages = Math.ceil(totalSites / PAGE_SIZE);

  const filteredSites = useMemo(() => {
    let filtered = paginatedSites;

    if (selectedRegion) {
      filtered = filtered.filter((site) => site.region === selectedRegion);
    }

    if (selectedZona) {
      filtered = filtered.filter((site) => site.zona === selectedZona);
    }

    return filtered.sort((a, b) => a.siteCode.localeCompare(b.siteCode));
  }, [paginatedSites, selectedRegion, selectedZona]);

  const renderSiteCard = ({ item }: { item: Site }) => (
    <View style={styles.siteCard}>
      <View style={styles.siteHeader}>
        <Text style={styles.siteName}>{item.name}</Text>
        <Text style={styles.siteCode}>{item.siteCode}</Text>
      </View>
      <View style={styles.siteDetails}>
        {item.tipologia && (
          <Text style={styles.siteDetailText}>Tipología: {item.tipologia}</Text>
        )}
        <Text style={styles.siteDetailText}>Región: {item.region}</Text>
        <Text style={styles.siteDetailText}>Zona: {item.zona}</Text>
        {item.provincia && <Text style={styles.siteDetailText}>Provincia: {item.provincia}</Text>}
        {item.distrito && <Text style={styles.siteDetailText}>Distrito: {item.distrito}</Text>}
      </View>
      <View style={styles.coordsRow}>
        <MapPin size={14} color="#6B7280" />
        <Text style={styles.coordsText}>
          {item.lat.toFixed(6)}, {item.lng.toFixed(6)}
        </Text>
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: "Sitios",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
              <X size={24} color="#111827" />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Buscar por código, nombre, provincia..."
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch("")}>
              <X size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filtersContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[
              { type: "region", label: "Todas las regiones", value: null },
              ...regions.map((r) => ({ type: "region", label: r, value: r })),
            ]}
            keyExtractor={(item, index) => `region-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedRegion === item.value && styles.filterChipActive,
                ]}
                onPress={() => setSelectedRegion(item.value)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedRegion === item.value && styles.filterChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.filtersList}
          />
        </View>

        <View style={styles.filtersContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[
              { type: "zona", label: "Todas las zonas", value: null },
              ...zonas.map((z) => ({ type: "zona", label: z, value: z })),
            ]}
            keyExtractor={(item, index) => `zona-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedZona === item.value && styles.filterChipActive,
                ]}
                onPress={() => setSelectedZona(item.value)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedZona === item.value && styles.filterChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.filtersList}
          />
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            Mostrando {currentPage * PAGE_SIZE + 1} - {Math.min((currentPage + 1) * PAGE_SIZE, totalSites)} de {totalSites} sitios
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddForm(!showAddForm)}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Agregar Sitio</Text>
          </TouchableOpacity>
        </View>

        {showAddForm && (
          <View style={styles.addFormContainer}>
            <Text style={styles.formTitle}>Nuevo Sitio</Text>
            <TextInput
              style={styles.formInput}
              value={newSite.siteCode}
              onChangeText={(text) => setNewSite({ ...newSite, siteCode: text })}
              placeholder="Código (ej: SITE-00101)"
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={styles.formInput}
              value={newSite.name}
              onChangeText={(text) => setNewSite({ ...newSite, name: text })}
              placeholder="Nombre"
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={styles.formInput}
              value={newSite.tipologia}
              onChangeText={(text) => setNewSite({ ...newSite, tipologia: text })}
              placeholder="Tipología (ej: CONVERGENTE 1, CONVERGENTE 2)"
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.formRow}>
              <TextInput
                style={[styles.formInput, styles.formInputHalf]}
                value={newSite.region}
                onChangeText={(text) => setNewSite({ ...newSite, region: text })}
                placeholder="Región"
                placeholderTextColor="#9CA3AF"
              />
              <TextInput
                style={[styles.formInput, styles.formInputHalf]}
                value={newSite.zona}
                onChangeText={(text) => setNewSite({ ...newSite, zona: text })}
                placeholder="Zona"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <TextInput
              style={styles.formInput}
              value={newSite.departamento}
              onChangeText={(text) => setNewSite({ ...newSite, departamento: text })}
              placeholder="Departamento"
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.formRow}>
              <TextInput
                style={[styles.formInput, styles.formInputHalf]}
                value={newSite.provincia}
                onChangeText={(text) => setNewSite({ ...newSite, provincia: text })}
                placeholder="Provincia"
                placeholderTextColor="#9CA3AF"
              />
              <TextInput
                style={[styles.formInput, styles.formInputHalf]}
                value={newSite.distrito}
                onChangeText={(text) => setNewSite({ ...newSite, distrito: text })}
                placeholder="Distrito"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <TextInput
              style={styles.formInput}
              value={newSite.address}
              onChangeText={(text) => setNewSite({ ...newSite, address: text })}
              placeholder="Dirección"
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.formRow}>
              <TextInput
                style={[styles.formInput, styles.formInputHalf]}
                value={newSite.lat}
                onChangeText={(text) => setNewSite({ ...newSite, lat: text })}
                placeholder="Latitud"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.formInput, styles.formInputHalf]}
                value={newSite.lng}
                onChangeText={(text) => setNewSite({ ...newSite, lng: text })}
                placeholder="Longitud"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.formButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddForm(false);
                  setNewSite({
                    siteCode: "",
                    name: "",
                    tipologia: "",
                    region: "",
                    zona: "",
                    departamento: "",
                    provincia: "",
                    distrito: "",
                    address: "",
                    lat: "",
                    lng: "",
                  });
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => {
                  if (!newSite.siteCode || !newSite.name || !newSite.lat || !newSite.lng) {
                    return;
                  }
                  addSite({
                    siteCode: newSite.siteCode,
                    name: newSite.name,
                    tipologia: newSite.tipologia,
                    region: newSite.region,
                    zona: newSite.zona,
                    departamento: newSite.departamento,
                    provincia: newSite.provincia,
                    distrito: newSite.distrito,
                    address: newSite.address,
                    lat: parseFloat(newSite.lat),
                    lng: parseFloat(newSite.lng),
                    isPrincipal: null,
                    parentSiteId: null,
                  });
                  setShowAddForm(false);
                  setNewSite({
                    siteCode: "",
                    name: "",
                    tipologia: "",
                    region: "",
                    zona: "",
                    departamento: "",
                    provincia: "",
                    distrito: "",
                    address: "",
                    lat: "",
                    lng: "",
                  });
                  loadPage(currentPage, searchQuery);
                }}
              >
                <Text style={styles.saveButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isLoadingPage ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.emptyText}>Cargando sitios...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredSites}
            renderItem={renderSiteCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <AlertCircle size={48} color="#9CA3AF" />
                <Text style={styles.emptyText}>No se encontraron sitios</Text>
              </View>
            }
            ListFooterComponent={
              totalPages > 1 ? (
                <View style={styles.paginationContainer}>
                  <TouchableOpacity
                    style={[styles.paginationButton, currentPage === 0 && styles.paginationButtonDisabled]}
                    onPress={handlePrevPage}
                    disabled={currentPage === 0}
                  >
                    <ChevronLeft size={20} color={currentPage === 0 ? "#9CA3AF" : "#2563EB"} />
                    <Text style={[styles.paginationButtonText, currentPage === 0 && styles.paginationButtonTextDisabled]}>
                      Anterior
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.paginationInfo}>
                    <Text style={styles.paginationText}>
                      Página {currentPage + 1} de {totalPages}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.paginationButton, currentPage >= totalPages - 1 && styles.paginationButtonDisabled]}
                    onPress={handleNextPage}
                    disabled={currentPage >= totalPages - 1}
                  >
                    <Text style={[styles.paginationButtonText, currentPage >= totalPages - 1 && styles.paginationButtonTextDisabled]}>
                      Siguiente
                    </Text>
                    <ChevronRight size={20} color={currentPage >= totalPages - 1 ? "#9CA3AF" : "#2563EB"} />
                  </TouchableOpacity>
                </View>
              ) : null
            }
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
  },
  filtersContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filtersList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: "#2563EB",
  },
  filterChipText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500" as const,
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  statsContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statsText: {
    fontSize: 12,
    color: "#6B7280",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  addFormContainer: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#111827",
    marginBottom: 12,
  },
  formInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    marginBottom: 12,
  },
  formRow: {
    flexDirection: "row",
    gap: 8,
  },
  formInputHalf: {
    flex: 1,
  },
  formButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#6B7280",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#10B981",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  siteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  siteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  siteName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#111827",
    flex: 1,
  },
  siteCode: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#2563EB",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  siteDetails: {
    gap: 6,
    marginBottom: 12,
  },
  siteDetailText: {
    fontSize: 13,
    color: "#6B7280",
  },
  coordsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  coordsText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontFamily: "monospace",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 48,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  paginationButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  paginationButtonDisabled: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#2563EB",
  },
  paginationButtonTextDisabled: {
    color: "#9CA3AF",
  },
  paginationInfo: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  paginationText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500" as const,
  },
});
