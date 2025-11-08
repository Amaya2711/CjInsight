import React from "react";
import { StyleSheet } from "react-native";
import RNMapView, { Marker } from "react-native-maps";

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

export default function CrewsMapView({
  center,
  markers,
  zoom = 12,
  onMarkerPress,
}: CrewsMapViewProps) {
  const latitudeDelta = zoom ? 0.5 / zoom : 0.05;
  const longitudeDelta = zoom ? 0.5 / zoom : 0.05;

  return (
    <RNMapView
      style={styles.map}
      initialRegion={{
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta,
        longitudeDelta,
      }}
    >
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          coordinate={{ latitude: marker.lat, longitude: marker.lng }}
          title={marker.title}
          description={marker.description}
          pinColor={marker.color}
          onPress={() => onMarkerPress?.(marker.id)}
        />
      ))}
    </RNMapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
