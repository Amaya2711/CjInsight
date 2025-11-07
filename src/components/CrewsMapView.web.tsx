import React, { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface CrewMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  color: string;
  type?: 'crew' | 'site';
}

interface CrewsMapViewProps {
  center: { lat: number; lng: number };
  markers: CrewMarker[];
  zoom?: number;
  onMarkerPress?: (markerId: string) => void;
}

const createColoredIcon = (color: string, type?: 'crew' | 'site') => {
  const colorMap: Record<string, string> = {
    "#16A34A": "green",
    "#CA8A04": "yellow",
    "#DC2626": "red",
    "#3B82F6": "blue",
  };
  
  const colorName = colorMap[color] || "blue";
  
  return L.icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${colorName}.png`,
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
};

export default function CrewsMapView({
  center,
  markers,
  zoom = 12,
  onMarkerPress,
}: CrewsMapViewProps) {
  const markerIcons = useMemo(() => {
    const icons: Record<string, L.Icon> = {};
    markers.forEach((marker) => {
      const key = `${marker.color}-${marker.type || 'crew'}`;
      if (!icons[key]) {
        icons[key] = createColoredIcon(marker.color, marker.type);
      }
    });
    return icons;
  }, [markers]);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {markers.map((marker) => {
          const iconKey = `${marker.color}-${marker.type || 'crew'}`;
          return (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              icon={markerIcons[iconKey]}
              eventHandlers={{
                click: () => onMarkerPress?.(marker.id),
              }}
            >
              <Popup>
                <div>
                  <strong>{marker.title}</strong>
                  <br />
                  {marker.description}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
