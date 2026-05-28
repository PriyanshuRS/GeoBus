import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Switch, Alert } from 'react-native';
import MapView, { UrlTile, Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';
// 1. Import Expo Location
import * as Location from 'expo-location';

// CRITICAL: Ensure this remains YOUR local IP address
const BACKEND_URL = 'http://10.109.81.66:3000'; 

export default function HomeScreen() {
  const [isDriver, setIsDriver] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const socketRef = useRef<any>(null);
  // Ref to hold our active location subscription so we can cancel it later
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);

  // --- 1. WebSocket Initialization ---
  useEffect(() => {
    socketRef.current = io(BACKEND_URL, {
      transports: ['websocket'],
      autoConnect: true
    });

    socketRef.current.on('connect', () => setIsConnected(true));
    socketRef.current.on('disconnect', () => setIsConnected(false));

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // --- 2. Driver Location Tracking Logic ---
  useEffect(() => {
    // If user switches to Passenger, stop tracking
    if (!isDriver) {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
        console.log('🛑 Stopped tracking driver location');
      }
      return;
    }

    // If user switches to Driver, start tracking
    const startTracking = async () => {
      // Request permission from the OS
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need location access to broadcast your route.');
        setIsDriver(false);
        return;
      }

      console.log('📡 Starting driver location broadcast...');
      
      // Watch position continuously
      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          // High accuracy uses GPS chip. Balanced uses cell towers/WiFi.
          accuracy: Location.Accuracy.High, 
          // Broadcast every 5 seconds OR if they move 10 meters
          timeInterval: 5000, 
          distanceInterval: 10,
        },
        (location) => {
          const newCoords = {
            lat: location.coords.latitude,
            lng: location.coords.longitude
          };
          
          setCurrentLocation(newCoords);

          // Emit the live coordinate to the Node backend!
          if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('driverLocationUpdate', {
              routeId: 1, // Hardcoded for Route 101 for now
              coordinates: newCoords
            });
            console.log(`📍 Broadcasted: ${newCoords.lat}, ${newCoords.lng}`);
          }
        }
      );
    };

    startTracking();

    // Cleanup when component unmounts or mode switches
    return () => {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
      }
    };
  }, [isDriver]); // Re-run this effect ONLY when the toggle switch changes

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <MapView
        style={styles.map}
        mapType="none" 
        initialRegion={{
          latitude: 40.7128, 
          longitude: -74.0060,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
      >
        <UrlTile
          urlTemplate="https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
          zIndex={1} 
        />
        
        {/* Render a marker showing the driver's current position on their own map */}
        {isDriver && currentLocation && (
          <Marker 
            coordinate={{ latitude: currentLocation.lat, longitude: currentLocation.lng }}
            title="My Bus"
            description="Broadcasting live..."
            pinColor="#ff4757"
          />
        )}
      </MapView>

      <View style={styles.overlay}>
        <View style={[styles.statusBadge, isConnected ? styles.bgSuccess : styles.bgDanger]}>
          <Text style={styles.statusText}>
            {isConnected ? '⚡ SERVER LIVE' : '📡 CONNECTING...'}
          </Text>
        </View>

        <View style={styles.toggleContainer}>
          <Text style={styles.toggleText}>Passenger</Text>
          <Switch
            value={isDriver}
            onValueChange={setIsDriver}
            trackColor={{ false: '#767577', true: '#ff4757' }}
            thumbColor={'#ffffff'}
          />
          <Text style={styles.toggleText}>Driver</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  map: { ...StyleSheet.absoluteFillObject },
  overlay: { 
    position: 'absolute', 
    top: 50, 
    width: '100%', 
    alignItems: 'center',
    zIndex: 10, 
    elevation: 10, 
  },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12, marginBottom: 10 },
  bgSuccess: { backgroundColor: '#2ed573' },
  bgDanger: { backgroundColor: '#ff4757' },
  statusText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  toggleContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 30 },
  toggleText: { color: 'white', marginHorizontal: 10, fontWeight: 'bold', fontSize: 16 }
});