import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { calculateDistanceOnPath, getETAString } from '../utils/geo';

interface DashboardHudProps {
  userRole: 'passenger' | 'driver' | null;
  selectedRoute: number | null;
  routes: { id: number; name: string; path_coordinates?: any }[];
  currentLocation: { lat: number; lng: number; speed?: number | null } | null;
  activeBuses: { [key: string]: { lat: number; lng: number; speed?: number | null } };
  passengerLocation: { lat: number; lng: number } | null;
}

export function DashboardHud({
  userRole,
  selectedRoute,
  routes,
  currentLocation,
  activeBuses,
  passengerLocation,
}: DashboardHudProps) {
  const route = routes.find(r => r.id === selectedRoute);

  if (userRole === 'driver' && currentLocation) {
    const dist = calculateDistanceOnPath(currentLocation, null, route?.path_coordinates);
    const eta = getETAString(dist, currentLocation.speed || 5);
    return (
      <View style={styles.hudCard}>
        <Text style={styles.hudTitle}>Route Progress</Text>
        <Text style={styles.hudText}>ETA to Terminus: <Text style={styles.hudHighlight}>{eta}</Text></Text>
        <Text style={styles.hudSubText}>{(dist / 1000).toFixed(1)} km remaining</Text>
      </View>
    );
  }

  if (userRole === 'passenger' && selectedRoute !== null) {
    const buses = Object.values(activeBuses);
    if (buses.length === 0) return null;
    
    let minTimeStr = "";
    let minDist = Infinity;
    buses.forEach(bus => {
      const dist = calculateDistanceOnPath(bus, passengerLocation, route?.path_coordinates);
      if (dist < minDist) {
        minDist = dist;
        minTimeStr = getETAString(dist, bus.speed || 5);
      }
    });

    if (minDist === Infinity) return null;

    return (
      <View style={styles.hudCard}>
        <Text style={styles.hudTitle}>Live Tracking</Text>
        <Text style={styles.hudText}>Nearest Bus: <Text style={styles.hudHighlight}>{minTimeStr}</Text></Text>
        <Text style={styles.hudSubText}>{(minDist / 1000).toFixed(1)} km away</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  hudCard: { backgroundColor: 'rgba(30, 39, 46, 0.95)', padding: 16, borderRadius: 16, marginTop: 16, borderWidth: 1, borderColor: '#57606f' },
  hudTitle: { color: '#a4b0be', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  hudText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  hudHighlight: { color: '#2ed573' },
  hudSubText: { color: '#747d8c', fontSize: 14, marginTop: 4 }
});
