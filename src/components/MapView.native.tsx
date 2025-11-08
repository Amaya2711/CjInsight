import React from "react";
import { StyleSheet } from "react-native";
import RNMapView, { Circle, Marker } from "react-native-maps";

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

export default function MapView({
  site,
  currentLocation,
  geofenceRadius = 200,
}: MapViewProps) {
  return (
    <RNMapView
      style={styles.map}
      initialRegion={{
        latitude: site.lat,
        longitude: site.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
    >
      <Marker
        coordinate={{ latitude: site.lat, longitude: site.lng }}
        title={site.siteCode}
      />
      <Circle
        center={{ latitude: site.lat, longitude: site.lng }}
        radius={geofenceRadius}
        fillColor="rgba(37, 99, 235, 0.2)"
        strokeColor="#2563EB"
        strokeWidth={2}
      />
      {currentLocation && (
        <Marker
          coordinate={{
            latitude: currentLocation.lat,
            longitude: currentLocation.lng,
          }}
          title="Tu ubicación"
          pinColor="#16A34A"
        />
      )}
    </RNMapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
