import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Switch, Alert, TouchableOpacity } from 'react-native';
import MapView, { UrlTile, Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';
import * as Location from 'expo-location';
import { Picker } from '@react-native-picker/picker';

const BACKEND_URL = 'http://10.109.81.66:3000';

export default function HomeScreen() {
  const [isDriver, setIsDriver] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [routes, setRoutes] = useState<{id: number, name: string}[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [activeBuses, setActiveBuses] = useState<{[key: string]: {lat: number, lng: number}}>({});
  
  const [isReporting, setIsReporting] = useState(false);
  
  const socketRef = useRef<any>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/routes`)
      .then((res) => res.json())
      .then((data) => {
        setRoutes(data);
        if (data.length > 0) setSelectedRoute(data[0].id);
      })
      .catch((err) => console.error('❌ Failed to fetch routes:', err));
  }, []);

  useEffect(() => {
    socketRef.current = io(BACKEND_URL, { transports: ['websocket'], autoConnect: true });
    socketRef.current.on('connect', () => setIsConnected(true));
    socketRef.current.on('disconnect', () => setIsConnected(false));
    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, []);

  useEffect(() => {
    if (!isDriver || selectedRoute === null) {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }
      return;
    }

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required.');
        setIsDriver(false);
        return;
      }

      locationSubscriptionRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        (location) => {
          const newCoords = { lat: location.coords.latitude, lng: location.coords.longitude };
          setCurrentLocation(newCoords);
          if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('driverLocationUpdate', { routeId: selectedRoute, coordinates: newCoords });
          }
        }
      );
    };

    startTracking();
    return () => { if (locationSubscriptionRef.current) locationSubscriptionRef.current.remove(); };
  }, [isDriver, selectedRoute]);

  useEffect(() => {
    if (isDriver || !isConnected || !socketRef.current || selectedRoute === null) return;

    socketRef.current.emit('subscribeToRoute', selectedRoute);
    setActiveBuses({});

    const handleBusUpdate = (data: any) => {
      setActiveBuses((prevBuses) => ({ ...prevBuses, [data.driverId]: data.coordinates }));
    };

    socketRef.current.on('busLocation', handleBusUpdate);
    return () => { socketRef.current.off('busLocation', handleBusUpdate); };
  }, [isDriver, isConnected, selectedRoute]);


  const reportPresence = async () => {
    if (!socketRef.current || selectedRoute === null) return;
    setIsReporting(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need your location to verify your report.');
        setIsReporting(false);
        return;
      }


      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = { lat: location.coords.latitude, lng: location.coords.longitude };

      socketRef.current.emit('passengerReport', {
        routeId: selectedRoute,
        coordinates: coords
      });

      Alert.alert('Report Sent ', 'Verifying your physical coordinates against the route geometry...');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to get location.');
    } finally {
      setTimeout(() => setIsReporting(false), 2000); 
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <MapView
        style={styles.map}
        mapType="none" 
        initialRegion={{ latitude: 40.7128, longitude: -74.0060, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
      >
        <UrlTile urlTemplate="https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png" maximumZ={19} flipY={false} zIndex={1} />
        
        {isDriver && currentLocation && (
          <Marker coordinate={{ latitude: currentLocation.lat, longitude: currentLocation.lng }} title="My Bus" pinColor="#ff4757" />
        )}

        {!isDriver && Object.entries(activeBuses).map(([driverId, coords]) => (
          <Marker key={driverId} coordinate={{ latitude: coords.lat, longitude: coords.lng }} title={`Bus on Route ${selectedRoute}`} pinColor="#3742fa" />
        ))}
      </MapView>

      <View style={styles.overlay}>
        <View style={[styles.statusBadge, isConnected ? styles.bgSuccess : styles.bgDanger]}>
          <Text style={styles.statusText}>{isConnected ? '⚡ SERVER LIVE' : '📡 CONNECTING...'}</Text>
        </View>

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedRoute}
            onValueChange={(itemValue) => setSelectedRoute(itemValue)}
            style={styles.picker}
            dropdownIconColor="white"
          >
            {routes.map((route) => (
              <Picker.Item key={route.id} label={route.name} value={route.id} />
            ))}
          </Picker>
        </View>

        <View style={styles.toggleContainer}>
          <Text style={styles.toggleText}>Passenger</Text>
          <Switch value={isDriver} onValueChange={setIsDriver} trackColor={{ false: '#767577', true: '#ff4757' }} thumbColor={'#ffffff'} />
          <Text style={styles.toggleText}>Driver</Text>
        </View>
      </View>

      {}
      {!isDriver && selectedRoute !== null && (
        <View style={styles.reportContainer}>
          <TouchableOpacity 
            style={[styles.reportButton, isReporting && styles.reportButtonDisabled]} 
            onPress={reportPresence} 
            disabled={isReporting}
          >
            <Text style={styles.reportButtonText}>
              {isReporting ? 'Verifying...' : '🙋‍♂️ I am on this bus!'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  map: { ...StyleSheet.absoluteFillObject },
  overlay: { position: 'absolute', top: 50, width: '100%', alignItems: 'center', zIndex: 10, elevation: 10 },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12, marginBottom: 10 },
  bgSuccess: { backgroundColor: '#2ed573' },
  bgDanger: { backgroundColor: '#ff4757' },
  statusText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  pickerContainer: { backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 20, width: '80%', marginBottom: 10, overflow: 'hidden' },
  picker: { color: 'white', width: '100%', height: 50 },
  toggleContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 30 },
  toggleText: { color: 'white', marginHorizontal: 10, fontWeight: 'bold', fontSize: 16 },

  reportContainer: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center', zIndex: 10, elevation: 10 },
  reportButton: { backgroundColor: '#3742fa', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 25, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  reportButtonDisabled: { backgroundColor: '#747d8c' },
  reportButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});