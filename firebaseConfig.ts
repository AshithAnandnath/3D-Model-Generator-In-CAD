import { initializeApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

// ------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------

const config = {
  // PASTE YOUR FIREBASE KEYS HERE
  apiKey: "AIzaSyD-EXAMPLE-KEY-REPLACE-ME", 
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// ------------------------------------------------------------------
// SAFE INITIALIZATION LOGIC
// ------------------------------------------------------------------

const isPlaceholder = config.apiKey.includes("REPLACE-ME");

let app;
let db: Firestore | null = null;
let auth: Auth | null = null;

if (!isPlaceholder) {
  try {
    app = initializeApp(config);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("Firebase initialized successfully");
  } catch (e) {
    console.error("Firebase Initialization Error:", e);
  }
} else {
  console.warn("Firebase config is missing. App running in offline/demo mode.");
}

// Export the initialized instances (or null if not configured)
export { db, auth, isPlaceholder as isMissingConfig };