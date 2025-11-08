import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { getRutaByCuadrillaIdTimeRange, type CuadrillaRutaDB } from '@/services/cuadrillaRuta';
import { MapPin, Calendar, Clock, ArrowLeft, Navigation2 } from 'lucide-react-native';

// Importaciones condicionales según la plataforma
let MapView: any, Polyline: any, Marker: any, PROVIDER_GOOGLE: any;
if (Platform.OS !== 'web') {
  const RNMaps = require('react-native-maps');
  MapView = RNMaps.default;
  Polyline = RNMaps.Polyline;
  Marker = RNMaps.Marker;
  PROVIDER_GOOGLE = RNMaps.PROVIDER_GOOGLE;
}

// Importaciones para web
let MapContainer: any, TileLayer: any, LeafletPolyline: any, LeafletMarker: any, Popup: any;
if (Platform.OS === 'web') {
  const Leaflet = require('react-leaflet');
  MapContainer = Leaflet.MapContainer;
  TileLayer = Leaflet.TileLayer;
  LeafletPolyline = Leaflet.Polyline;
  LeafletMarker = Leaflet.Marker;
  Popup = Leaflet.Popup;
  require('leaflet/dist/leaflet.css');
}

type TimeFilter = 'today' | 'week' | 'month';

export default function HistorialRutaScreen() {
  const { user } = useAuthStore();
  const [rutaData, setRutaData] = useState<CuadrillaRutaDB[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    if (user?.id) {
      loadRuta();
    }
  }, [user?.id, timeFilter, selectedDate]);

  const loadRuta = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      console.log('[HistorialRuta] 📡 Cargando ruta para cuadrilla:', user.id);
      
      let startDate: Date;
      let endDate: Date = new Date();

      switch (timeFilter) {
        case 'today':
          startDate = new Date(selectedDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(selectedDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'week':
          startDate = new Date(selectedDate);
          startDate.setDate(startDate.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(selectedDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'month':
          startDate = new Date(selectedDate);
          startDate.setDate(startDate.getDate() - 30);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(selectedDate);
          endDate.setHours(23, 59, 59, 999);
          break;
      }

      const result = await getRutaByCuadrillaIdTimeRange(user.id, startDate, endDate);

      if (result.error) {
        console.error('[HistorialRuta] ❌ Error cargando ruta:', result.error);
        Alert.alert('Error', 'No se pudo cargar el historial de ruta');
        setRutaData([]);
      } else if (result.data) {
        console.log('[HistorialRuta] ✅ Ruta cargada:', result.data.length, 'puntos');
        setRutaData(result.data);
      }
    } catch (error) {
      console.error('[HistorialRuta] ❌ Excepción cargando ruta:', error);
      Alert.alert('Error', 'Ocurrió un error al cargar el historial');
      setRutaData([]);
    } finally {
      setLoading(false);
    }
  };

  const getMapRegion = () => {
    if (rutaData.length === 0) {
      // Ubicación por defecto (Lima, Perú)
      return {
        latitude: -12.0464,
        longitude: -77.0428,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    const latitudes = rutaData.map(p => p.latitud);
    const longitudes = rutaData.map(p => p.longitud);

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    const latDelta = (maxLat - minLat) * 1.5 || 0.01;
    const lngDelta = (maxLng - minLng) * 1.5 || 0.01;

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(latDelta, 0.01),
      longitudeDelta: Math.max(lngDelta, 0.01),
    };
  };

  const getMapCenter = (): [number, number] => {
    const region = getMapRegion();
    return [region.latitude, region.longitude];
  };

  const getMapZoom = () => {
    if (rutaData.length === 0) return 13;
    const region = getMapRegion();
    const latDelta = region.latitudeDelta;
    if (latDelta > 0.5) return 10;
    if (latDelta > 0.1) return 12;
    if (latDelta > 0.05) return 13;
    return 14;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDistance = () => {
    if (rutaData.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i < rutaData.length; i++) {
      const prev = rutaData[i - 1];
      const curr = rutaData[i];
      const distance = getDistanceBetweenPoints(
        prev.latitud,
        prev.longitud,
        curr.latitud,
        curr.longitud
      );
      totalDistance += distance;
    }
    return totalDistance;
  };

  const getDistanceBetweenPoints = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (degrees: number): number => {
    return degrees * (Math.PI / 180);
  };

  const renderNativeMap = () => {
    if (rutaData.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MapPin size={48} color="#ccc" />
          <Text style={styles.emptyText}>No hay datos de ruta para mostrar</Text>
          <Text style={styles.emptySubtext}>
            Inicia el seguimiento desde tu perfil para comenzar a registrar tu ruta
          </Text>
        </View>
      );
    }

    const coordinates = rutaData.map(point => ({
      latitude: point.latitud,
      longitude: point.longitud,
    }));

    const startPoint = rutaData[0];
    const endPoint = rutaData[rutaData.length - 1];

    return (
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={getMapRegion()}
        showsUserLocation
        showsMyLocationButton
      >
        {/* Línea de ruta */}
        <Polyline
          coordinates={coordinates}
          strokeColor="#0066cc"
          strokeWidth={4}
        />

        {/* Marcador de inicio */}
        <Marker
          coordinate={{
            latitude: startPoint.latitud,
            longitude: startPoint.longitud,
          }}
          title="Inicio"
          description={formatTime(startPoint.timestamp)}
          pinColor="green"
        />

        {/* Marcador de fin */}
        {rutaData.length > 1 && (
          <Marker
            coordinate={{
              latitude: endPoint.latitud,
              longitude: endPoint.longitud,
            }}
            title="Fin"
            description={formatTime(endPoint.timestamp)}
            pinColor="red"
          />
        )}
      </MapView>
    );
  };

  const renderWebMap = () => {
    if (rutaData.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MapPin size={48} color="#ccc" />
          <Text style={styles.emptyText}>No hay datos de ruta para mostrar</Text>
          <Text style={styles.emptySubtext}>
            Inicia el seguimiento desde tu perfil para comenzar a registrar tu ruta
          </Text>
        </View>
      );
    }

    const positions: [number, number][] = rutaData.map(point => [
      point.latitud,
      point.longitud,
    ]);

    const startPoint = rutaData[0];
    const endPoint = rutaData[rutaData.length - 1];

    return (
      <MapContainer
        center={getMapCenter()}
        zoom={getMapZoom()}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Línea de ruta */}
        <LeafletPolyline
          positions={positions}
          color="#0066cc"
          weight={4}
        />

        {/* Marcador de inicio */}
        <LeafletMarker position={[startPoint.latitud, startPoint.longitud]}>
          <Popup>
            <strong>Inicio</strong>
            <br />
            {formatTime(startPoint.timestamp)}
          </Popup>
        </LeafletMarker>

        {/* Marcador de fin */}
        {rutaData.length > 1 && (
          <LeafletMarker position={[endPoint.latitud, endPoint.longitud]}>
            <Popup>
              <strong>Fin</strong>
              <br />
              {formatTime(endPoint.timestamp)}
            </Popup>
          </LeafletMarker>
        )}
      </MapContainer>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Historial de Ruta',
          headerShown: true,
        }}
      />

      {/* Header con filtros */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#0066cc" />
        </TouchableOpacity>

        <Text style={styles.title}>Consultar Ruta</Text>
      </View>

      {/* Filtros de tiempo */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, timeFilter === 'today' && styles.filterButtonActive]}
          onPress={() => setTimeFilter('today')}
        >
          <Text style={[styles.filterText, timeFilter === 'today' && styles.filterTextActive]}>
            Hoy
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, timeFilter === 'week' && styles.filterButtonActive]}
          onPress={() => setTimeFilter('week')}
        >
          <Text style={[styles.filterText, timeFilter === 'week' && styles.filterTextActive]}>
            7 días
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, timeFilter === 'month' && styles.filterButtonActive]}
          onPress={() => setTimeFilter('month')}
        >
          <Text style={[styles.filterText, timeFilter === 'month' && styles.filterTextActive]}>
            30 días
          </Text>
        </TouchableOpacity>
      </View>

      {/* Estadísticas */}
      {rutaData.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <MapPin size={20} color="#0066cc" />
            <Text style={styles.statValue}>{rutaData.length}</Text>
            <Text style={styles.statLabel}>Puntos</Text>
          </View>

          <View style={styles.statItem}>
            <Navigation2 size={20} color="#0066cc" />
            <Text style={styles.statValue}>{calculateDistance().toFixed(2)} km</Text>
            <Text style={styles.statLabel}>Distancia</Text>
          </View>

          <View style={styles.statItem}>
            <Clock size={20} color="#0066cc" />
            <Text style={styles.statValue}>
              {rutaData.length > 0 ? formatTime(rutaData[0].timestamp) : '--:--'}
            </Text>
            <Text style={styles.statLabel}>Inicio</Text>
          </View>
        </View>
      )}

      {/* Mapa */}
      <View style={styles.mapContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066cc" />
            <Text style={styles.loadingText}>Cargando ruta...</Text>
          </View>
        ) : Platform.OS === 'web' ? (
          renderWebMap()
        ) : (
          renderNativeMap()
        )}
      </View>

      {/* Información adicional */}
      {rutaData.length > 0 && (
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Calendar size={16} color="#666" />
            <Text style={styles.infoText}>
              {formatDate(new Date(rutaData[0].timestamp))}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Clock size={16} color="#666" />
            <Text style={styles.infoText}>
              {formatTime(rutaData[0].timestamp)} - {formatTime(rutaData[rutaData.length - 1].timestamp)}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#0066cc',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 1,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  mapContainer: {
    flex: 1,
    marginTop: 8,
  },
  map: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  infoContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
});
