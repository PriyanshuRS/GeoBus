import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, Alert, TouchableOpacity } from 'react-native';
import MapView from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';
import * as Location from 'expo-location';
import { Picker } from '@react-native-picker/picker';

import { app, auth } from '../../firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';

const BACKEND_URL = 'http://10.109.81.66:3000'; 
import { getDistanceInMeters, calculateDistanceOnPath, getETAString } from '../../utils/geo';
import { AuthScreen } from '../../components/AuthScreen';
import { RoleSelectionScreen } from '../../components/RoleSelectionScreen';
import { LiveMap } from '../../components/LiveMap';
import { DashboardHud } from '../../components/DashboardHud';

export default function HomeScreen() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [userRole, setUserRole] = useState<'passenger' | 'driver' | null>(null);
  const [busNumberInput, setBusNumberInput] = useState('');
  const [isVerifyingDriver, setIsVerifyingDriver] = useState(false);

  const [isConnected, setIsConnected] = useState(false);
  const [routes, setRoutes] = useState<{id: number, name: string, path_coordinates?: any}[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const [bookmarkedRoutes, setBookmarkedRoutes] = useState<number[]>([]);
  
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number, speed?: number | null} | null>(null);
  const [activeBuses, setActiveBuses] = useState<{[key: string]: {lat: number, lng: number, speed?: number | null}}>({});
  const [isReporting, setIsReporting] = useState(false);
  const [passengerLocation, setPassengerLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const socketRef = useRef<any>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const passengerLocationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    if (userRole !== 'passenger') {
      if (passengerLocationSubscriptionRef.current) {
        passengerLocationSubscriptionRef.current.remove();
        passengerLocationSubscriptionRef.current = null;
      }
      return;
    }

    let isSubscribed = true;

    const startPassengerTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      if (passengerLocationSubscriptionRef.current) {
        passengerLocationSubscriptionRef.current.remove();
        passengerLocationSubscriptionRef.current = null;
      }

      passengerLocationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 0
        },
        (location) => {
          if (!isSubscribed) return;
          setPassengerLocation({
            lat: location.coords.latitude,
            lng: location.coords.longitude
          });
        }
      );
    };

    startPassengerTracking();

    return () => {
      isSubscribed = false;
      if (passengerLocationSubscriptionRef.current) {
        passengerLocationSubscriptionRef.current.remove();
        passengerLocationSubscriptionRef.current = null;
      }
    };
  }, [userRole]);

  // Dynamically center map on selected route's first point
  useEffect(() => {
    if (selectedRoute !== null && routes.length > 0 && mapRef.current) {
      const route = routes.find(r => r.id === selectedRoute);
      if (route && route.path_coordinates) {
        let coords: {latitude: number, longitude: number}[] = [];
        try {
          const parsed = typeof route.path_coordinates === 'string' 
            ? JSON.parse(route.path_coordinates) 
            : route.path_coordinates;
          if (Array.isArray(parsed) && parsed.length > 0) {
            coords = parsed.map(c => ({ latitude: c.lat, longitude: c.lng }));
          }
        } catch(e) {}
        if (coords.length > 0) {
          mapRef.current.animateToRegion({
            latitude: coords[0].latitude,
            longitude: coords[0].longitude,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08
          }, 1000);
        }
      }
    }
  }, [selectedRoute, routes]);

  const [trackingInterval, setTrackingInterval] = useState<number>(2000);
  const lastLocationRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);
  const stationarySinceRef = useRef<number | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        setUserRole(null);
        setBookmarkedRoutes([]);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/routes`)
      .then((res) => res.json())
      .then((data) => {
        setRoutes(data);
        if (data.length > 0) setSelectedRoute(data[0].id);
      })
      .catch((err) => console.error('Failed to fetch routes:', err));

    if (currentUser) {
      fetch(`${BACKEND_URL}/api/bookmarks/${currentUser.uid}`)
        .then((res) => res.json())
        .then((data) => {
          const ids = data.map((r: any) => r.id);
          setBookmarkedRoutes(ids);
        })
        .catch((err) => console.error('Failed to fetch user bookmarks:', err));
    }
  }, [currentUser]);

  useEffect(() => {
    socketRef.current = io(BACKEND_URL, { transports: ['websocket'], autoConnect: true });
    socketRef.current.on('connect', () => setIsConnected(true));
    socketRef.current.on('disconnect', () => setIsConnected(false));
    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, []);

  const evaluateThrottling = useCallback((lat: number, lng: number, rawSpeed: number | null) => {
    const now = Date.now();
    let speed = rawSpeed;

    if (lastLocationRef.current && (speed === null || speed < 0)) {
      const distance = getDistanceInMeters(
        lat,
        lng,
        lastLocationRef.current.lat,
        lastLocationRef.current.lng
      );
      const timeDiffSec = (now - lastLocationRef.current.timestamp) / 1000;
      speed = timeDiffSec > 0 ? distance / timeDiffSec : 0;
    }

    const isSlow = speed !== null && speed < 0.5;

    if (isSlow) {
      if (stationarySinceRef.current === null) {
        stationarySinceRef.current = now;
      } else {
        const stationaryDuration = now - stationarySinceRef.current;
        if (stationaryDuration >= 15000 && trackingInterval === 2000) {
          console.log(`Adaptive Throttling: stationary for ${Math.round(stationaryDuration/1000)}s. Throttling GPS to 5s.`);
          setTrackingInterval(5000);
        }
      }
    } else {
      stationarySinceRef.current = null;
      if (trackingInterval === 5000) {
        console.log(`Resumed movement (Speed: ${speed?.toFixed(2)} m/s). Restoring fast 2s tracking.`);
        setTrackingInterval(2000);
      }
    }

    lastLocationRef.current = { lat, lng, timestamp: now };
  }, [trackingInterval]);

  useEffect(() => {
    if (userRole !== 'driver' || selectedRoute === null) {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }
      setTrackingInterval(2000);
      lastLocationRef.current = null;
      stationarySinceRef.current = null;
      return;
    }

    let isSubscribed = true;

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Access Denied', 'Location tracking is required for drivers.');
        setUserRole(null);
        return;
      }

      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }

      locationSubscriptionRef.current = await Location.watchPositionAsync(
        { 
          accuracy: Location.Accuracy.High, 
          timeInterval: trackingInterval, 
          distanceInterval: 0
        },
        (location) => {
          if (!isSubscribed) return;
          const lat = location.coords.latitude;
          const lng = location.coords.longitude;
          const speed = location.coords.speed;

          const newCoords = { lat, lng, speed };
          setCurrentLocation(newCoords);

          if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('driverLocationUpdate', { 
              routeId: selectedRoute, 
              coordinates: { lat, lng }, 
              speed: speed 
            });
          }

          evaluateThrottling(lat, lng, speed);
        }
      );
    };

    startTracking();

    return () => {
      isSubscribed = false;
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }
    };
  }, [userRole, selectedRoute, trackingInterval, evaluateThrottling]);

  useEffect(() => {
    if (userRole !== 'passenger' || !isConnected || !socketRef.current || selectedRoute === null) return;

    socketRef.current.emit('subscribeToRoute', selectedRoute);
    setActiveBuses({});

    const handleBusUpdate = (data: any) => {
      setActiveBuses((prevBuses) => ({ 
        ...prevBuses, 
        [data.driverId]: { ...data.coordinates, speed: data.speed } 
      }));
    };

    socketRef.current.on('busLocation', handleBusUpdate);
    return () => { socketRef.current.off('busLocation', handleBusUpdate); };
  }, [userRole, isConnected, selectedRoute]);

  const handleAuthAction = async () => {
    if (!authEmail || !authPassword) {
      Alert.alert('Error', 'Please fill out your identity fields.');
      return;
    }
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        Alert.alert('Success', 'Secure user registration complete.');
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
    } catch (err: any) {
      Alert.alert('Identity Exception', err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleDriverVerify = async () => {
    if (!busNumberInput.trim()) {
      Alert.alert('Error', 'Please enter your Bus Fleet Number.');
      return;
    }
    setIsVerifyingDriver(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/driver/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ busNumber: busNumberInput })
      });
      const data = await response.json();

      if (response.ok && data.verified) {
        Alert.alert('Access Granted', data.message);
        setUserRole('driver');
      } else {
        Alert.alert('Access Denied', data.message || 'Unauthorized verification code.');
      }
    } catch (err) {
      Alert.alert('Network Error', 'Could not reach verification server.');
    } finally {
      setIsVerifyingDriver(false);
    }
  };

  const handleToggleBookmark = async () => {
    if (selectedRoute === null || !currentUser) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/bookmarks/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: currentUser.uid, routeId: selectedRoute })
      });
      const data = await response.json();

      if (data.status === 'added') {
        setBookmarkedRoutes((prev) => [...prev, selectedRoute]);
      } else if (data.status === 'removed') {
        setBookmarkedRoutes((prev) => prev.filter((id) => id !== selectedRoute));
      }
    } catch (err) {
      console.error('Failed to save bookmark setting:', err);
    }
  };

  const reportPresence = async () => {
    if (!socketRef.current || selectedRoute === null) return;
    setIsReporting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Denied', 'Verification requires your position.');
        setIsReporting(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      socketRef.current.emit('passengerReport', { routeId: selectedRoute, coordinates: { lat: location.coords.latitude, lng: location.coords.longitude } });
      Alert.alert('Report Sent', 'Running spatial validation check...');
    } catch (e) {
      Alert.alert('Error', 'Failed to read sensor maps.');
    } finally {
      setTimeout(() => setIsReporting(false), 2000);
    }
  };

  if (!currentUser) {
    return (
      <AuthScreen
        authEmail={authEmail}
        setAuthEmail={setAuthEmail}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        isSignUp={isSignUp}
        setIsSignUp={setIsSignUp}
        handleAuthAction={handleAuthAction}
      />
    );
  }

  if (userRole === null) {
    return (
      <RoleSelectionScreen
        currentUser={currentUser}
        busNumberInput={busNumberInput}
        setBusNumberInput={setBusNumberInput}
        isVerifyingDriver={isVerifyingDriver}
        handleDriverVerify={handleDriverVerify}
        setUserRole={setUserRole}
        handleLogout={handleLogout}
      />
    );
  }

  const isCurrentRouteBookmarked = selectedRoute !== null && bookmarkedRoutes.includes(selectedRoute);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LiveMap
        mapRef={mapRef}
        routes={routes}
        selectedRoute={selectedRoute}
        userRole={userRole}
        currentLocation={currentLocation}
        activeBuses={activeBuses}
      />

      <View style={styles.overlay}>
        <View style={styles.topRow}>
          <View style={[
            styles.statusBadge, 
            isConnected 
              ? (userRole === 'driver' && trackingInterval === 5000 ? styles.bgWarning : styles.bgSuccess) 
              : styles.bgDanger
          ]}>
            <Text style={styles.statusText}>
              {userRole.toUpperCase()} MODE // {isConnected ? 'ONLINE' : 'OFFLINE'}
              {userRole === 'driver' && ` (${trackingInterval === 2000 ? 'ACTIVE' : 'BATTERY SAVER'})`}
            </Text>
          </View>
          
          <TouchableOpacity style={styles.logoutButton} onPress={() => setUserRole(null)}>
            <Text style={styles.logoutText}>Exit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.controlsRow}>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={selectedRoute} onValueChange={(val) => setSelectedRoute(val)} style={styles.picker} mode="dropdown">
              {routes.map((r) => {
                const isSaved = bookmarkedRoutes.includes(r.id);
                return <Picker.Item key={r.id} label={`${isSaved ? '★ ' : ''}${r.name}`} value={r.id} />;
              })}
            </Picker>
          </View>

          {userRole === 'passenger' && (
            <TouchableOpacity style={[styles.bookmarkBtn, isCurrentRouteBookmarked && styles.bookmarkActive]} onPress={handleToggleBookmark}>
              <Text style={styles.bookmarkBtnText}>{isCurrentRouteBookmarked ? '★' : '☆'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <DashboardHud
          userRole={userRole}
          selectedRoute={selectedRoute}
          routes={routes}
          currentLocation={currentLocation}
          activeBuses={activeBuses}
          passengerLocation={passengerLocation}
        />
      </View>

      {userRole === 'passenger' && selectedRoute !== null && (
        <View style={styles.reportContainer}>
          <TouchableOpacity style={[styles.reportButton, isReporting && styles.reportButtonDisabled]} onPress={reportPresence} disabled={isReporting}>
            <Text style={styles.reportButtonText}>{isReporting ? 'Verifying Math...' : 'Confirm I\'m on this bus!'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  overlay: { position: 'absolute', top: 50, width: '100%', paddingHorizontal: 16, zIndex: 10, elevation: 10 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statusBadge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12 },
  bgSuccess: { backgroundColor: '#2ed573' },
  bgDanger: { backgroundColor: '#ff4757' },
  bgWarning: { backgroundColor: '#ffa502' },
  statusText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  logoutButton: { backgroundColor: 'rgba(255, 71, 87, 0.9)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12 },
  logoutText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  controlsRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  pickerWrapper: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: 16, overflow: 'hidden', height: 50, justifyContent: 'center' },
  picker: { color: 'white' },
  bookmarkBtn: { backgroundColor: 'rgba(0,0,0,0.85)', width: 50, height: 50, borderRadius: 16, marginLeft: 8, justifyContent: 'center', alignItems: 'center' },
  bookmarkActive: { backgroundColor: '#ffa502' },
  bookmarkBtnText: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  reportContainer: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center', zIndex: 10, elevation: 10 },
  reportButton: { backgroundColor: '#3742fa', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 25 },
  reportButtonDisabled: { backgroundColor: '#747d8c' },
  reportButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});