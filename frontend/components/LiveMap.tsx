import React from 'react';
import { StyleSheet } from 'react-native';
import MapView, { UrlTile, Marker, Polyline } from 'react-native-maps';

interface LiveMapProps {
  mapRef: React.RefObject<MapView | null>;
  routes: { id: number; name: string; path_coordinates?: any }[];
  selectedRoute: number | null;
  userRole: 'passenger' | 'driver' | null;
  currentLocation: { lat: number; lng: number } | null;
  activeBuses: { [key: string]: { lat: number; lng: number } };
}

export function LiveMap({
  mapRef,
  routes,
  selectedRoute,
  userRole,
  currentLocation,
  activeBuses,
}: LiveMapProps) {
  const route = routes.find(r => r.id === selectedRoute);
  let coords: { latitude: number; longitude: number }[] = [];
  if (route && route.path_coordinates) {
    try {
      const parsed = typeof route.path_coordinates === 'string' 
        ? JSON.parse(route.path_coordinates) 
        : route.path_coordinates;
      if (Array.isArray(parsed)) {
        coords = parsed.map(c => ({ latitude: c.lat, longitude: c.lng }));
      }
    } catch (e) {}
  }

  return (
    <MapView 
      ref={mapRef}
      style={styles.map} 
      mapType="none" 
      initialRegion={{ latitude: 26.4542, longitude: 80.3512, latitudeDelta: 0.1, longitudeDelta: 0.1 }}
    >
      <UrlTile 
        urlTemplate="https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png" 
        maximumZ={19} 
        flipY={false} 
        zIndex={1} 
      />
      
      {coords.length > 0 && (
        <Polyline 
          coordinates={coords} 
          strokeColor="#3742fa" 
          strokeWidth={4}
          zIndex={10}
        />
      )}

      {userRole === 'driver' && currentLocation && (
        <Marker 
          coordinate={{ latitude: currentLocation.lat, longitude: currentLocation.lng }} 
          title="My Fleet Vehicle" 
          pinColor="#ff4757" 
        />
      )}

      {userRole === 'passenger' && Object.entries(activeBuses).map(([driverId, busCoords]) => (
        <Marker 
          key={driverId} 
          coordinate={{ latitude: busCoords.lat, longitude: busCoords.lng }} 
          title={`Route ${selectedRoute} Active Transit`} 
          pinColor="#3742fa" 
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { ...StyleSheet.absoluteFillObject },
});
