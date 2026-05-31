import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCdb4tsPSZRs9ohvc2SYOjbRfq0whAqFfs",
  authDomain: "geo-bus-52103.firebaseapp.com",
  projectId: "geo-bus-52103",
  storageBucket: "geo-bus-52103.firebasestorage.app",
  messagingSenderId: "659506897641",
  appId: "1:659506897641:web:4a1b2239d195f1f05a8678",
  measurementId: "G-XZC45CXF65"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence for React Native
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});