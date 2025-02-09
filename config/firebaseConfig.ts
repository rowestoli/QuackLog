// config/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// For older SDKs, use Constants.manifest.extra; for SDK 46+ use Constants.expoConfig?.extra:
const extra = Constants.manifest?.extra || Constants.expoConfig?.extra || {};

// (Optional) Log the extra values to verify they are loaded correctly.
console.log("Firebase Extra Config:", extra);

const firebaseConfig = {
  apiKey: extra.FIREBASE_API_KEY,
  authDomain: extra.FIREBASE_AUTH_DOMAIN || `${extra.FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: extra.FIREBASE_PROJECT_ID,
  // Add additional configuration fields if needed.
};

const app = initializeApp(firebaseConfig);
// Use AsyncStorage for persistence so that auth state is saved between sessions.
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

export { auth };
