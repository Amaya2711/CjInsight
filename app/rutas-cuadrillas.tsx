import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/useAppStore';
import { getRutaByCuadrillaId, getRutaByCuadrillaIdTimeRange, type CuadrillaRutaDB } from '@/services/cuadrillaRuta';
import { MapPin, Navigation, Clock, Zap } from 'lucide-react-native';

export default function RutasCuadrillasScreen() {
  const { crews, currentUser } = useAppStore();
  const [selectedCrewId, setSelectedCrewId] = useState<string | null>(null);
  const [rutaData, setRutaData] = useState<CuadrillaRutaDB[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week'>('today');

  const loadRuta = async (crewId: string) => {
    try {
      setLoading(true);
      const numericId = parseInt(crewId, 10);

      if (isNaN(numericId)) {
        console.error('ID de cuadrilla inválido:', crewId);
        return;
      }

      let result;
      if (timeFilter === 'today') {
        const hoy = new Date();
        const inicioHoy = new Date(hoy.setHours(0, 0, 0, 0));
        const finHoy = new Date(hoy.setHours(23, 59, 59, 999));
        result = await getRutaByCuadrillaIdTimeRange(numericId, inicioHoy, finHoy);
      } else if (timeFilter === 'week') {
        const hoy = new Date();
        const hace7Dias = new Date(hoy);
        hace7Dias.setDate(hace7Dias.getDate() - 7);
        result = await getRutaByCuadrillaIdTimeRange(numericId, hace7Dias, hoy);
      } else {
        result = await getRutaByCuadrillaId(numericId, 500);
      }

      if (result.data) {
        setRutaData(result.data);
        console.log(`[RutasCuadrillas] Cargados ${result.data.length} puntos de ruta`);
      } else if (result.error) {
        console.error('[RutasCuadrillas] Error cargando ruta:', result.error);
        setRutaData([]);
      }
    } catch (error) {
      console.error('[RutasCuadrillas] Excepción cargando ruta:', error);
      setRutaData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCrewSelect = (crewId: string) => {
    setSelectedCrewId(crewId);
    loadRuta(crewId);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const calculateTotalDistance = (): number => {
    if (rutaData.length < 2) return 0;
    
    let total = 0;
    for (let i = 1; i < rutaData.length; i++) {
      const prev = rutaData[rutaData.length - i];
      const curr = rutaData[rutaData.length - i - 1];
      total += calculateDistanceKm(
        Number(prev.latitud),
        Number(prev.longitud),
        Number(curr.latitud),
        Number(curr.longitud)
      );
    }
    return total;
  };

  const selectedCrew = crews.find(c => c.id === selectedCrewId);
  const totalDistance = calculateTotalDistance();

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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Rutas de Cuadrillas',
          headerStyle: { backgroundColor: '#1e40af' },
          headerTintColor: '#fff',
        }}
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Seguimiento de Rutas GPS</Text>
        <Text style={styles.headerSubtitle}>
          Visualiza el historial de ubicaciones de cada cuadrilla
        </Text>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterButton, timeFilter === 'today' && styles.filterButtonActive]}
          onPress={() => {
            setTimeFilter('today');
            if (selectedCrewId) loadRuta(selectedCrewId);
          }}
        >
          <Text style={[styles.filterButtonText, timeFilter === 'today' && styles.filterButtonTextActive]}>
            Hoy
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, timeFilter === 'week' && styles.filterButtonActive]}
          onPress={() => {
            setTimeFilter('week');
            if (selectedCrewId) loadRuta(selectedCrewId);
          }}
        >
          <Text style={[styles.filterButtonText, timeFilter === 'week' && styles.filterButtonTextActive]}>
            7 Días
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, timeFilter === 'all' && styles.filterButtonActive]}
          onPress={() => {
            setTimeFilter('all');
            if (selectedCrewId) loadRuta(selectedCrewId);
          }}
        >
          <Text style={[styles.filterButtonText, timeFilter === 'all' && styles.filterButtonTextActive]}>
            Todo
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seleccionar Cuadrilla</Text>
          {crews.map((crew) => (
            <TouchableOpacity
              key={crew.id}
              style={[
                styles.crewCard,
                selectedCrewId === crew.id && styles.crewCardSelected,
              ]}
              onPress={() => handleCrewSelect(crew.id)}
            >
              <View style={styles.crewCardHeader}>
                <Text style={styles.crewName}>{crew.name}</Text>
                {selectedCrewId === crew.id && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>Seleccionado</Text>
                  </View>
                )}
              </View>
              <Text style={styles.crewZone}>Zona: {crew.zone}</Text>
              {crew.currentLocation && (
                <View style={styles.crewLocation}>
                  <MapPin size={14} color="#64748b" />
                  <Text style={styles.crewLocationText}>
                    {crew.currentLocation.lat.toFixed(6)}, {crew.currentLocation.lng.toFixed(6)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {selectedCrew && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Ruta de {selectedCrew.name}
            </Text>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1e40af" />
                <Text style={styles.loadingText}>Cargando ruta...</Text>
              </View>
            ) : rutaData.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Navigation size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No hay datos de ruta</Text>
                <Text style={styles.emptyText}>
                  Esta cuadrilla no tiene puntos GPS registrados en el período seleccionado
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.statsContainer}>
                  <View style={styles.statCard}>
                    <MapPin size={20} color="#1e40af" />
                    <Text style={styles.statValue}>{rutaData.length}</Text>
                    <Text style={styles.statLabel}>Puntos GPS</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Navigation size={20} color="#16a34a" />
                    <Text style={styles.statValue}>{totalDistance.toFixed(2)} km</Text>
                    <Text style={styles.statLabel}>Distancia aprox.</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Clock size={20} color="#ea580c" />
                    <Text style={styles.statValue}>
                      {Math.round((new Date(rutaData[0]?.timestamp || 0).getTime() - 
                                   new Date(rutaData[rutaData.length - 1]?.timestamp || 0).getTime()) / 3600000)} h
                    </Text>
                    <Text style={styles.statLabel}>Duración</Text>
                  </View>
                </View>

                <View style={styles.pointsList}>
                  <Text style={styles.pointsListTitle}>
                    Últimos 20 Puntos GPS
                  </Text>
                  {rutaData.slice(0, 20).map((punto, index) => (
                    <View key={punto.id} style={styles.pointCard}>
                      <View style={styles.pointHeader}>
                        <View style={styles.pointNumber}>
                          <Text style={styles.pointNumberText}>{index + 1}</Text>
                        </View>
                        <View style={styles.pointInfo}>
                          <Text style={styles.pointCoords}>
                            {Number(punto.latitud).toFixed(6)}, {Number(punto.longitud).toFixed(6)}
                          </Text>
                          <View style={styles.pointTimeRow}>
                            <Clock size={12} color="#64748b" />
                            <Text style={styles.pointTime}>{formatDate(punto.timestamp)}</Text>
                          </View>
                        </View>
                      </View>
                      {(punto.accuracy || punto.speed) && (
                        <View style={styles.pointMeta}>
                          {punto.accuracy && (
                            <View style={styles.pointMetaItem}>
                              <Text style={styles.pointMetaLabel}>Precisión:</Text>
                              <Text style={styles.pointMetaValue}>{punto.accuracy.toFixed(1)}m</Text>
                            </View>
                          )}
                          {punto.speed && (
                            <View style={styles.pointMetaItem}>
                              <Zap size={12} color="#64748b" />
                              <Text style={styles.pointMetaValue}>{(punto.speed * 3.6).toFixed(1)} km/h</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#1e40af',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#bfdbfe',
  },
  filterRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#1e40af',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#64748b',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 12,
  },
  crewCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  crewCardSelected: {
    borderColor: '#1e40af',
    backgroundColor: '#eff6ff',
  },
  crewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  crewName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#0f172a',
  },
  selectedBadge: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  selectedBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#ffffff',
  },
  crewZone: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  crewLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  crewLocationText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  pointsList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pointsListTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#0f172a',
    marginBottom: 12,
  },
  pointCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pointHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  pointNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointNumberText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1e40af',
  },
  pointInfo: {
    flex: 1,
  },
  pointCoords: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#0f172a',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 4,
  },
  pointTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pointTime: {
    fontSize: 12,
    color: '#64748b',
  },
  pointMeta: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    marginLeft: 44,
  },
  pointMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pointMetaLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  pointMetaValue: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#0f172a',
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  accessDeniedText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#DC2626',
    marginBottom: 8,
  },
  accessDeniedSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
