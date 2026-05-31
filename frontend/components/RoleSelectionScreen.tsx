import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User } from 'firebase/auth';

interface RoleSelectionScreenProps {
  currentUser: User;
  busNumberInput: string;
  setBusNumberInput: (num: string) => void;
  isVerifyingDriver: boolean;
  handleDriverVerify: () => void;
  setUserRole: (role: 'passenger' | 'driver' | null) => void;
  handleLogout: () => void;
}

export function RoleSelectionScreen({
  currentUser,
  busNumberInput,
  setBusNumberInput,
  isVerifyingDriver,
  handleDriverVerify,
  setUserRole,
  handleLogout,
}: RoleSelectionScreenProps) {
  return (
    <SafeAreaView style={styles.authContainer}>
      <Text style={styles.authTitle}>Account Verified</Text>
      <Text style={[styles.authSubtitle, { marginBottom: 10 }]}>User: {currentUser.email}</Text>
      <Text style={styles.authSubtitle}>Select your network deployment profile:</Text>
      
      <TouchableOpacity style={styles.authButton} onPress={() => setUserRole('passenger')}>
        <Text style={styles.authButtonText}>Launch Passenger Dashboard</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <View style={styles.driverAuthCard}>
        <Text style={styles.driverCardTitle}>Driver Deployment Gate</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Enter Fleet Vehicle Number (e.g., BUS-101)" 
          placeholderTextColor="#747d8c" 
          value={busNumberInput} 
          onChangeText={setBusNumberInput} 
          autoCapitalize="characters" 
        />
        <TouchableOpacity 
          style={[styles.authButton, { backgroundColor: '#ff4757' }]} 
          onPress={handleDriverVerify} 
          disabled={isVerifyingDriver}
        >
          <Text style={styles.authButtonText}>
            {isVerifyingDriver ? 'Verifying Code...' : 'Verify Fleet Credentials'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={{ marginTop: 30 }} onPress={handleLogout}>
        <Text style={{ color: '#ff4757', textAlign: 'center', fontWeight: 'bold' }}>Sign Out of Account</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  authContainer: { flex: 1, backgroundColor: '#1e272e', justifyContent: 'center', padding: 24 },
  authTitle: { color: 'white', fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  authSubtitle: { color: '#a4b0be', fontSize: 16, textAlign: 'center', marginBottom: 32 },
  authButton: { backgroundColor: '#3742fa', padding: 16, borderRadius: 12, alignItems: 'center', marginVertical: 8 },
  authButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#57606f', marginVertical: 24 },
  driverAuthCard: { backgroundColor: '#2f3542', padding: 16, borderRadius: 16, borderColor: '#57606f', borderWidth: 1 },
  driverCardTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  input: { backgroundColor: '#1e272e', color: 'white', padding: 14, borderRadius: 8, marginBottom: 12, fontSize: 14, borderWidth: 1, borderColor: '#747d8c' },
});
