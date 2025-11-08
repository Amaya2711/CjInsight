import React from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapViewProps {
  site: {
    lat: number;
    lng: number;
    siteCode: string;
  };
  currentLocation: {
    lat: number;
    lng: number;
  } | null;
  geofenceRadius?: number;
}

const blueIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const greenIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function MapView({
  site,
  currentLocation,
  geofenceRadius = 200,
}: MapViewProps) {
  return (
    <div style={{ height: "100%", width: "100%" }}>
      <MapContainer
        center={[site.lat, site.lng]}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={[site.lat, site.lng]} icon={blueIcon}>
          <Popup>
            <div>
              <strong>{site.siteCode}</strong>
            </div>
          </Popup>
        </Marker>
        <Circle
          center={[site.lat, site.lng]}
          radius={geofenceRadius}
          pathOptions={{
            fillColor: "rgba(37, 99, 235, 0.2)",
            color: "#2563EB",
            weight: 2,
          }}
        />
        {currentLocation && (
          <Marker position={[currentLocation.lat, currentLocation.lng]} icon={greenIcon}>
            <Popup>
              <div>
                <strong>Tu ubicacion</strong>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
