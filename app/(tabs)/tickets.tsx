import { router } from "expo-router";
import { AlertCircle, CheckCircle, ChevronLeft, ChevronRight, Clock, MapPin, Plus, Search, Trash2, X } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppStore } from "@/store/useAppStore";
import type { Priority, Ticket } from "@/types";
import { calculateSLARemaining, formatSLATime } from "@/utils/validation";
import { listTickets, mapTicketToApp, getTicketsTotalCount, healthCheckTickets, getTicketsCountByStatus, type StatusCount, deleteTicket as deleteTicketFromDB } from "@/services/tickets";

const PRIORITY_COLORS: Record<Priority, { bg: string; text: string; border: string }> = {
  P0: { bg: "#FEE2E2", text: "#DC2626", border: "#FCA5A5" },
  P1: { bg: "#FFEDD5", text: "#EA580C", border: "#FDBA74" },
  P2: { bg: "#FEF3C7", text: "#CA8A04", border: "#FDE047" },
  P3: { bg: "#D1FAE5", text: "#16A34A", border: "#86EFAC" },
};

const PRIORITY_LABELS: Record<Priority, string> = {
  P0: "Crítico",
  P1: "Alto",
  P2: "Medio",
  P3: "Bajo",
};

type StatusFilter = "recepcion" | "asignar" | "arribo" | "neutralizar" | "validar" | "cierre";

export default function TicketsScreen() {
  const { tickets, currentUser, initializeStore, evidenceBundles, dispatches, clearAllTickets } = useAppStore();
  const [selectedPriority, setSelectedPriority] = useState<Priority | "ALL">("ALL");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("recepcion");
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [totalTickets, setTotalTickets] = useState(0);
  const [paginatedTickets, setPaginatedTickets] = useState<Ticket[]>([]);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [statusCounts, setStatusCounts] = useState<StatusCount>({
    recepcion: 0,
    asignar: 0,
    arribo: 0,
    neutralizar: 0,
    validar: 0,
    cierre: 0,
    total: 0,
  });

  const isFieldUser = currentUser?.userType === "campo";
  const PAGE_SIZE = 50;

  const handleClearAllTickets = async () => {
    Alert.alert(
      "Borrar todos los tickets",
      "¿Estás seguro de que deseas eliminar todos los tickets de Supabase? Esta acción no se puede deshacer.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              console.log('[Tickets] 🗑️ Deleting all tickets from Supabase...');
              
              const allTicketsResult = await listTickets({ page: 0, pageSize: 1000 });
              if (allTicketsResult.error) {
                throw new Error('No se pudo cargar los tickets: ' + allTicketsResult.error.message);
              }
              
              const allTickets = allTicketsResult.data || [];
              console.log(`[Tickets] Found ${allTickets.length} tickets to delete`);
              
              for (const ticket of allTickets) {
                const { error } = await deleteTicketFromDB(ticket.id);
                if (error) {
                  console.error(`[Tickets] ❌ Error deleting ticket ${ticket.id}:`, error.message);
                } else {
                  console.log(`[Tickets] ✅ Deleted ticket ${ticket.id}`);
                }
              }
              
              clearAllTickets();
              setPaginatedTickets([]);
              setTotalTickets(0);
              await loadStatusCounts();
              
              Alert.alert("Éxito", `${allTickets.length} tickets eliminados de Supabase`);
            } catch (error) {
              console.error('[Tickets] ❌ Error clearing all tickets:', error);
              Alert.alert("Error", "No se pudo eliminar todos los tickets: " + String(error));
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    initializeStore();
    healthCheckTickets().catch(err => console.error('[Tickets] Health check error:', err));
    loadStatusCounts();
  }, []);

  const loadStatusCounts = async () => {
    try {
      const counts = await getTicketsCountByStatus();
      setStatusCounts(counts);
      console.log('[Tickets] Status counts loaded:', counts);
    } catch (error) {
      console.error('[Tickets] Error loading status counts:', error);
    }
  };



  useEffect(() => {
    loadPage(currentPage, searchQuery);
  }, [currentPage, searchQuery, selectedStatus]);

  const loadPage = async (page: number, search: string) => {
    setIsLoadingPage(true);
    try {
      const result = await listTickets({ 
        page, 
        pageSize: PAGE_SIZE, 
        searchQuery: search,
        status: selectedStatus
      });
      if (result.error) {
        console.error('[Tickets] Error loading page:', result.error);
        return;
      }
      if (result.data) {
        const mapped = result.data.map(mapTicketToApp);
        setPaginatedTickets(mapped);
        setTotalTickets(result.count || 0);
      }
    } catch (error) {
      console.error('[Tickets] Error loading tickets:', error);
    } finally {
      setIsLoadingPage(false);
    }
  };

  const filteredTickets = useMemo(() => {
    let filtered = paginatedTickets;

    if (isFieldUser && currentUser?.crewId) {
      const myTicketIds = dispatches
        .filter((d) => d.crewId === currentUser.crewId)
        .map((d) => d.ticketId);
      filtered = filtered.filter((t) => myTicketIds.includes(t.id));
    }

    if (selectedPriority !== "ALL") {
      filtered = filtered.filter((t) => t.priority === selectedPriority);
    }

    return filtered.sort((a, b) => {
      const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [paginatedTickets, selectedPriority, isFieldUser, currentUser, dispatches]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadPage(currentPage, searchQuery),
      loadStatusCounts(),
    ]);
    setRefreshing(false);
  };

  const handleNextPage = () => {
    const maxPage = Math.ceil(totalTickets / PAGE_SIZE) - 1;
    if (currentPage < maxPage) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setCurrentPage(0);
  };

  const handleTicketPress = async (ticketId: string) => {
    const ticketInPage = paginatedTickets.find(t => t.id === ticketId);
    if (ticketInPage) {
      const store = useAppStore.getState();
      const existingTicket = store.tickets.find(t => t.id === ticketId);
      
      if (!existingTicket) {
        console.log('[Tickets] Adding ticket to local store:', ticketId);
        store.updateTicket(ticketId, ticketInPage);
      }
      
      router.push({ pathname: "/ticket/[id]", params: { id: ticketId } });
    }
  };

  const totalPages = Math.ceil(totalTickets / PAGE_SIZE);

  const renderTicketCard = ({ item }: { item: Ticket }) => {
    const sla = calculateSLARemaining(item);
    const colors = PRIORITY_COLORS[item.priority];
    const bundle = evidenceBundles.find((b) => b.ticketId === item.id);
    const isValidated = bundle?.valid || false;
    const site = useAppStore.getState().sites.find((s) => s.id === item.siteId || s.siteCode === item.siteId);

    return (
      <TouchableOpacity
        style={styles.ticketCard}
        onPress={() => handleTicketPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.ticketHeader}>
          <View style={[styles.priorityBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <Text style={[styles.priorityText, { color: colors.text }]}>
              {item.priority} - {PRIORITY_LABELS[item.priority]}
            </Text>
          </View>
          <ChevronRight size={20} color="#9CA3AF" />
        </View>

        <Text style={styles.ticketTitle}>{item.description || "Sin descripción"}</Text>
        
        {item.interventionType && (
          <Text style={styles.ticketInterventionType}>Tipo: {item.interventionType}</Text>
        )}

        <View style={styles.ticketMeta}>
          <Text style={styles.ticketSource}>Ticket: {(item as any).ticketSource || item.itsmRef || item.id}</Text>
        </View>
        
        <View style={styles.ticketMeta}>
          <Text style={styles.ticketSite}>Site: {item.siteId}</Text>
        </View>
        
        {site && (
          <View style={styles.ticketMeta}>
            <Text style={styles.ticketLocation}>{site.zona}, {site.region}</Text>
          </View>
        )}
        
        <View style={styles.ticketMeta}>
          <Text style={styles.ticketDate}>
            Abierto: {item.openedAt.toLocaleDateString("es-PE")} {item.openedAt.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
        
        {currentUser?.userType === "oficina" && (
          <View style={styles.statusRow}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{item.status.replace("_", " ").toUpperCase()}</Text>
            </View>
            {item.exclusionCause && (
              <Text style={styles.ticketExclusion} numberOfLines={1}>RFO: {item.exclusionCause}</Text>
            )}
          </View>
        )}

        {isValidated && (
          <View style={styles.validatedBadge}>
            <CheckCircle size={14} color="#16A34A" />
            <Text style={styles.validatedText}>Evidencia validada</Text>
          </View>
        )}

        {item.slaDeadlineAt && (
          <View style={[styles.slaContainer, sla.isOverdue && styles.slaOverdue]}>
            <Clock size={16} color={sla.isOverdue ? "#DC2626" : "#6B7280"} />
            <Text style={[styles.slaText, sla.isOverdue && styles.slaTextOverdue]}>
              {sla.isOverdue ? "Vencido" : `SLA: ${formatSLATime(sla.remainingMinutes)}`}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (!currentUser) {
    return (
      <View style={styles.emptyContainer}>
        <AlertCircle size={48} color="#9CA3AF" />
        <Text style={styles.emptyText}>Inicia sesión para ver tus tickets</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {currentUser?.userType === "oficina" && (
        <>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push("/(tabs)/create-ticket")}
            activeOpacity={0.8}
          >
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fabSecondary}
            onPress={() => router.push("/(tabs)/create-site")}
            activeOpacity={0.8}
          >
            <MapPin size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fabDelete}
            onPress={handleClearAllTickets}
            activeOpacity={0.8}
          >
            <Trash2 size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </>
      )}

      <View style={styles.searchContainer}>
        <Search size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Buscar por ref, site, alarma..."
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch("")}>
            <X size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {currentUser?.userType === "oficina" && (
        <View style={styles.statusFilterWrapper}>
          <Text style={styles.statusFilterTitle}>Estados</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusFilterContent}
          >
            <TouchableOpacity
              style={[styles.statusChip, selectedStatus === "recepcion" && styles.statusChipActive]}
              onPress={() => setSelectedStatus("recepcion")}
            >
              <Text style={[styles.statusChipText, selectedStatus === "recepcion" && styles.statusChipTextActive]}>
                Recepción ({statusCounts.recepcion})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusChip, selectedStatus === "asignar" && styles.statusChipActive]}
              onPress={() => setSelectedStatus("asignar")}
            >
              <Text style={[styles.statusChipText, selectedStatus === "asignar" && styles.statusChipTextActive]}>
                Asignar ({statusCounts.asignar})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusChip, selectedStatus === "arribo" && styles.statusChipActive]}
              onPress={() => setSelectedStatus("arribo")}
            >
              <Text style={[styles.statusChipText, selectedStatus === "arribo" && styles.statusChipTextActive]}>
                Arribo ({statusCounts.arribo})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusChip, selectedStatus === "neutralizar" && styles.statusChipActive]}
              onPress={() => setSelectedStatus("neutralizar")}
            >
              <Text style={[styles.statusChipText, selectedStatus === "neutralizar" && styles.statusChipTextActive]}>
                Neutralizar ({statusCounts.neutralizar})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusChip, selectedStatus === "validar" && styles.statusChipActive]}
              onPress={() => setSelectedStatus("validar")}
            >
              <Text style={[styles.statusChipText, selectedStatus === "validar" && styles.statusChipTextActive]}>
                Validar ({statusCounts.validar})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusChip, selectedStatus === "cierre" && styles.statusChipActive]}
              onPress={() => setSelectedStatus("cierre")}
            >
              <Text style={[styles.statusChipText, selectedStatus === "cierre" && styles.statusChipTextActive]}>
                Cierre ({statusCounts.cierre})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      <View style={styles.paginationInfo}>
        <Text style={styles.paginationText}>
          {isFieldUser
            ? `Mis tickets asignados: ${filteredTickets.length}`
            : `Mostrando ${filteredTickets.length} de ${totalTickets} tickets con estado "${selectedStatus}" en BD`}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[styles.filterChip, selectedPriority === "ALL" && styles.filterChipActive]}
          onPress={() => setSelectedPriority("ALL")}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedPriority === "ALL" && styles.filterChipTextActive,
            ]}
          >
            Todos ({filteredTickets.length})
          </Text>
        </TouchableOpacity>

        {(["P0", "P1", "P2", "P3"] as Priority[]).map((priority) => {
          const count = filteredTickets.filter(
            (t) => t.priority === priority
          ).length;
          const colors = PRIORITY_COLORS[priority];

          return (
            <TouchableOpacity
              key={priority}
              style={[
                styles.filterChip,
                selectedPriority === priority && {
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setSelectedPriority(priority)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedPriority === priority && { color: colors.text },
                ]}
              >
                {priority} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {filteredTickets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <AlertCircle size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>
            {isFieldUser ? "No tienes tickets asignados" : "No hay tickets con estos filtros"}
          </Text>
          {!isFieldUser && (
            <Text style={styles.emptySubtext}>
              {selectedPriority !== "ALL"
                ? `No hay tickets con estado "${selectedStatus}" y prioridad ${selectedPriority}`
                : `No hay tickets con estado "${selectedStatus}"`}
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredTickets}
          renderItem={renderTicketCard}
          keyExtractor={(item, index) => `ticket-${item.id || index}-${item.itsmRef || ''}`}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  statusFilterWrapper: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 12,
  },
  statusFilterTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#111827",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  statusFilterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statusChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  statusChipText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#6B7280",
  },
  statusChipTextActive: {
    color: "#FFFFFF",
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
  listContent: {
    padding: 16,
    gap: 12,
  },
  ticketCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "700" as const,
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#111827",
    marginBottom: 4,
  },
  ticketInterventionType: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: "#2563EB",
    marginBottom: 8,
  },
  ticketMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  ticketRef: {
    fontSize: 13,
    color: "#6B7280",
  },
  ticketSource: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#111827",
  },
  ticketSite: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#111827",
  },
  ticketLocation: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  ticketDate: {
    fontSize: 12,
    color: "#6B7280",
  },
  ticketExclusion: {
    fontSize: 11,
    color: "#EA580C",
    flex: 1,
    marginLeft: 8,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#EFF6FF",
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#2563EB",
  },
  slaContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  slaOverdue: {
    borderTopColor: "#FEE2E2",
  },
  slaText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#6B7280",
  },
  slaTextOverdue: {
    color: "#DC2626",
  },
  validatedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#D1FAE5",
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  validatedText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#16A34A",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#374151",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 8,
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    bottom: 100,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  fabSecondary: {
    position: "absolute",
    bottom: 164,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  fabDelete: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
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
    padding: 0,
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
