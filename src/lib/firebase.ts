import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

const getEnvValue = (key: string, fallback: string): string => {
    const val = (import.meta.env && import.meta.env[key]) as string | undefined;
    return (val && val.trim() !== '') ? val : fallback;
};

const firebaseConfig = {
    apiKey: getEnvValue("VITE_FIREBASE_API_KEY", "YOUR_API_KEY"),
    authDomain: getEnvValue("VITE_FIREBASE_AUTH_DOMAIN", "YOUR_AUTH_DOMAIN"),
    projectId: getEnvValue("VITE_FIREBASE_PROJECT_ID", "YOUR_PROJECT_ID"),
    storageBucket: getEnvValue("VITE_FIREBASE_STORAGE_BUCKET", "YOUR_STORAGE_BUCKET"),
    messagingSenderId: getEnvValue("VITE_FIREBASE_MESSAGING_SENDER_ID", "YOUR_MESSAGING_SENDER_ID"),
    appId: getEnvValue("VITE_FIREBASE_APP_ID", "YOUR_APP_ID")
};

// Debug Audit Log for Production & Development
console.log('[Firebase Config Audit] apiKey valid:', !!firebaseConfig.apiKey && firebaseConfig.apiKey !== 'YOUR_API_KEY', firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 6)}...` : 'NONE');
console.log('[Firebase Config Audit] authDomain:', firebaseConfig.authDomain);
console.log('[Firebase Config Audit] projectId:', firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// undefined の項目は保存しない（口コミ本文のない科目の comment: undefined などで setDoc が失敗するのを防ぐ）
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
export const googleProvider = new GoogleAuthProvider();
