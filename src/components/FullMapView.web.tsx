import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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

const siteIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const crewAvailableIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const crewBusyIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const crewOfflineIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const cuadrillaIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const getCrewIcon = (status: string) => {
  switch (status) {
    case "disponible":
      return crewAvailableIcon;
    case "ocupado":
      return crewBusyIcon;
    case "fuera_servicio":
      return crewOfflineIcon;
    default:
      return crewAvailableIcon;
  }
};

export default function FullMapView({
  sites,
  crews,
  center,
  zoom = 12,
}: FullMapViewProps) {
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
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const mapCenter = React.useMemo(() => {
    if (center) return center;

    const crewsWithLocation = crews.filter((c) => c.currentLocation !== null);

    if (crewsWithLocation.length > 0) {
      const sumLat = crewsWithLocation.reduce((sum, c) => sum + (c.currentLocation?.lat || 0), 0);
      const sumLng = crewsWithLocation.reduce((sum, c) => sum + (c.currentLocation?.lng || 0), 0);
      return {
        lat: sumLat / crewsWithLocation.length,
        lng: sumLng / crewsWithLocation.length,
      };
    }

    if (sites.length > 0) {
      return { lat: sites[0].lat, lng: sites[0].lng };
    }

    return { lat: -12.0464, lng: -77.0428 };
  }, [center, crews, sites]);

  const sitesWithLocation = sites.filter((s) => s.siteCode && s.lat && s.lng && s.lat !== 0 && s.lng !== 0);
  const crewsWithLocation = crews.filter((c) => c.id && c.currentLocation !== null && c.currentLocation.lat !== 0 && c.currentLocation.lng !== 0);

  if (loading) {
    return (
      <div style={{ height: "100%", width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#111827", fontSize: 16 }}>Cargando...</div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <div style={{ padding: 12, display: "flex", gap: 16, backgroundColor: "#FFFFFF" }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>{`Sites: ${sitesTotal}`}</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>{`Cuadrillas: ${cuadMarkers.length}`}</div>
      </div>
      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={zoom}
        style={{ height: "calc(100% - 48px)", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {crewsWithLocation.map((crew, index) => {
          const uniqueKey = `crew-${crew.id}-${index}`;
          return (
            <Marker
              key={uniqueKey}
              position={[crew.currentLocation!.lat, crew.currentLocation!.lng]}
              icon={getCrewIcon(crew.status)}
            >
              <Popup>
                <div>
                  <strong>{crew.name}</strong>
                  <br />
                  {`Estado: ${crew.status}`}
                  <br />
                  {`Zona: ${crew.zone}`}
                </div>
              </Popup>
            </Marker>
          );
        })}
        {cuadMarkers.map((m, i) => (
          <Marker
            key={`cuad-${m.row.id}-${i}`}
            position={[m.latitude, m.longitude]}
            icon={cuadrillaIcon}
          >
            <Popup>
              <div>
                <strong>{m.row.nombre}</strong>
                <br />
                {m.row.zona && `${m.row.zona} • `}
                {`${m.row.departamento}/${m.row.provincia}/${m.row.distrito}`}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
