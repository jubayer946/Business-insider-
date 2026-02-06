
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCzkI1NtU_u8DmvRfXYK8YtHk3ldaFQF6I",
  authDomain: "business-insider-4c8c5.firebaseapp.com",
  projectId: "business-insider-4c8c5",
  storageBucket: "business-insider-4c8c5.firebasestorage.app",
  messagingSenderId: "730147470435",
  appId: "1:730147470435:web:5a8c28f3b8ada0ad7c4c56",
  measurementId: "G-4TN4V7JNQK",
  databaseURL: "https://business-insider-4c8c5-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
export const db = getDatabase(app);

export default app;
