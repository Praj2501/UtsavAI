import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { getRemoteConfig, type RemoteConfig } from 'firebase/remote-config';
import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from 'firebase/app-check';

const rawApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
export const isFirebaseConfigValid = Boolean(rawApiKey && rawApiKey.startsWith('AIza'));

const firebaseConfig = {
  apiKey: rawApiKey || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'utsav-ai-demo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'utsav-ai-demo',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'utsav-ai-demo.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1234567890:web:abcdef',
};

export const isDemoMode =
  import.meta.env.VITE_DEMO_MODE === 'true' ||
  !rawApiKey ||
  rawApiKey.includes('Dummy');

// Initialize Firebase App
export const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth instance with Google Provider
export const auth: Auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: 'select_account' });

// Firestore instance with multi-tab persistent local cache
export const db: Firestore = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// Remote Config
export let remoteConfig: RemoteConfig | null = null;
if (typeof window !== 'undefined' && !isDemoMode) {
  try {
    remoteConfig = getRemoteConfig(app);
    remoteConfig.settings.minimumFetchIntervalMillis = 3600000; // 1 hour
  } catch {
    // Graceful fallback if Remote Config not supported in environment
    remoteConfig = null;
  }
}

// App Check (reCAPTCHA v3) - initialized only if site key is configured; never throws
export let appCheck: AppCheck | null = null;
const recaptchaSiteKey =
  import.meta.env.VITE_RECAPTCHA_SITE_KEY || import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY;

if (typeof window !== 'undefined' && recaptchaSiteKey && !isDemoMode) {
  try {
    if (import.meta.env.DEV) {
      // In development, enable debug token for testing App Check
      (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (error: unknown) {
    // Graceful degradation: never throw if App Check fails initialization
    console.warn('App Check initialization bypassed:', error);
    appCheck = null;
  }
}
