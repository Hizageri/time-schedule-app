import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signOut } from 'firebase/auth';
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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// undefined の項目は保存しない（口コミ本文のない科目の comment: undefined などで setDoc が失敗するのを防ぐ）
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
export const googleProvider = new GoogleAuthProvider();

/** ログイン中の利用者の ID トークン。ログインしていなければ null（期限が近ければ firebase が更新する） */
export const getCurrentIdToken = async (): Promise<string | null> => {
    const user = auth.currentUser;
    return user ? user.getIdToken() : null;
};

/** 今の利用者をログアウトさせる（onAuthStateChanged が動き、ログイン画面に戻る） */
export const signOutCurrentUser = async (): Promise<void> => {
    await signOut(auth);
};
