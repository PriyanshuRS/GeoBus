import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AuthScreenProps {
  authEmail: string;
  setAuthEmail: (email: string) => void;
  authPassword: string;
  setAuthPassword: (password: string) => void;
  isSignUp: boolean;
  setIsSignUp: (isSignUp: boolean) => void;
  handleAuthAction: () => void;
}

export function AuthScreen({
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  isSignUp,
  setIsSignUp,
  handleAuthAction,
}: AuthScreenProps) {
  return (
    <SafeAreaView style={styles.authContainer}>
      <Text style={styles.authTitle}>Secure Transit Gateway</Text>
      <Text style={styles.authSubtitle}>Please log in to register your network telemetry profile:</Text>
      
      <TextInput 
        style={styles.input} 
        placeholder="Email Address" 
        placeholderTextColor="#747d8c" 
        value={authEmail} 
        onChangeText={setAuthEmail} 
        keyboardType="email-address" 
        autoCapitalize="none" 
      />
      <TextInput 
        style={styles.input} 
        placeholder="Secure Password" 
        placeholderTextColor="#747d8c" 
        value={authPassword} 
        onChangeText={setAuthPassword} 
        secureTextEntry 
        autoCapitalize="none" 
      />

      <TouchableOpacity style={styles.authButton} onPress={handleAuthAction}>
        <Text style={styles.authButtonText}>{isSignUp ? 'Create Account' : 'Log In'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={{ marginTop: 16 }}>
        <Text style={{ color: '#3742fa', textAlign: 'center', fontWeight: 'bold' }}>
          {isSignUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
        </Text>
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
  input: { backgroundColor: '#1e272e', color: 'white', padding: 14, borderRadius: 8, marginBottom: 12, fontSize: 14, borderWidth: 1, borderColor: '#747d8c' },
});
