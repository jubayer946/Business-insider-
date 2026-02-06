import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Fix: Use a casted reference to access Vite's environment variables to avoid TypeScript errors on import.meta.env
const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyCzkI1NtU_u8DmvRfXYK8YtHk3ldaFQF6I",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "business-insider-4c8c5.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "business-insider-4c8c5",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "business-insider-4c8c5.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "730147470435",
  appId: env.VITE_FIREBASE_APP_ID || "1:730147470435:web:5a8c28f3b8ada0ad7c4c56",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-4TN4V7JNQK",
  databaseURL: env.VITE_FIREBASE_DATABASE_URL || "https://business-insider-4c8c5-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
export const db = getDatabase(app);

export default app;