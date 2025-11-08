import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, ActivityIndicator, Text } from "react-native";
import RNMapView, { Marker } from "react-native-maps";
import { getSitesTotalCount } from "@/services/sites";
import { listCuadrillas, toLatLng as toLatLngCuad, CuadrillaDB } from "@/services/cuadrillas";

interface Site {
  id: string;
  name: string;
  siteCode: string;
  lat: number;
  lng: number;
  address?: string;
}

interface Crew {
  id: string;
  name: string;
  status: string;
  zone: string;
  currentLocation: { lat: number; lng: number } | null;
}

interface FullMapViewProps {
  sites: Site[];
  crews: Crew[];
  center?: { lat: number; lng: number };
  zoom?: number;
}

const getCrewPinColor = (status: string): string => {
  switch (status) {
    case "disponible":
      return "#16A34A";
    case "ocupado":
      return "#CA8A04";
    case "fuera_servicio":
      return "#DC2626";
    default:
      return "#16A34A";
  }
};

export default function FullMapView({
  sites,
  crews,
  center,
  zoom = 12,
}: FullMapViewProps) {
  const mapRef = useRef<RNMapView>(null);
  const [sitesTotal, setSitesTotal] = useState<number>(0);
  const [cuadMarkers, setCuadMarkers] = useState<{ latitude: number; longitude: number; row: CuadrillaDB }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [st, cuad] = await Promise.all([
          getSitesTotalCount(),
          listCuadrillas(),
        ]);
        setSitesTotal(st);

        console.log("[MAP] sample cuadrillas (raw):", cuad.slice(0, 3).map((r: CuadrillaDB) => ({ id: r.id, lat: r.latitud, lng: r.longitud })));

        const mks = cuad.map((r: CuadrillaDB) => {
          const ll = toLatLngCuad(r);
          if (!ll) {
            console.warn("[MAP] invalid coord", { id: r.id, lat: r.latitud, lng: r.longitud });
            return null;
          }
          return { ...ll, row: r };
        }).filter(Boolean) as any[];
        console.log("[MAP] markers válidos:", mks.length, "de", cuad.length);
        setCuadMarkers(mks);

        if (mks.length && mapRef.current) {
          mapRef.current.fitToCoordinates(mks, {
            edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
            animated: true,
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const initialRegion = { latitude: -12.0464, longitude: -77.0428, latitudeDelta: 2, longitudeDelta: 2 };

  const sitesWithLocation = sites.filter((s) => s.siteCode && s.lat && s.lng && s.lat !== 0 && s.lng !== 0);
  const crewsWithLocation = crews.filter((c) => c.id && c.currentLocation !== null && c.currentLocation.lat !== 0 && c.currentLocation.lng !== 0);

  console.log(`[FullMapView] Rendering map with ${sitesWithLocation.length} sites and ${crewsWithLocation.length} crews`);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 12, flexDirection: "row", gap: 16, backgroundColor: "#FFFFFF" }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}>Sites: {sitesTotal}</Text>
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}>Cuadrillas: {cuadMarkers.length}</Text>
      </View>
      <RNMapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
      >

        {crewsWithLocation.map((crew, index) => {
          const uniqueKey = `crew-${crew.id}-${index}`;
          return (
            <Marker
              key={uniqueKey}
              coordinate={{
                latitude: crew.currentLocation!.lat,
                longitude: crew.currentLocation!.lng,
              }}
              title={crew.name}
              description={`Estado: ${crew.status} - Zona: ${crew.zone}`}
              pinColor={getCrewPinColor(crew.status)}
            />
          );
        })}
        {cuadMarkers.map((m, i) => (
          <Marker
            key={`cuad-${m.row.id}-${i}`}
            coordinate={{ latitude: m.latitude, longitude: m.longitude }}
            title={m.row.nombre}
            description={`${m.row.zona ?? ""} • ${m.row.departamento ?? ""}/${m.row.provincia ?? ""}/${m.row.distrito ?? ""}`}
            pinColor="#8B5CF6"
          />
        ))}
      </RNMapView>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
