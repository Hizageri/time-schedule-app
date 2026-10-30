// src/lib/firebase.ts の偽物（本物と同じ名前を export する）
import { GoogleAuthProvider, signOut } from './firebase-auth';
import { h } from '../setup';

export const auth = {};
export const db = {};
export const googleProvider = new GoogleAuthProvider();
export const getCurrentIdToken = async (): Promise<string | null> => (h.currentUser ? 'tok' : null);
export const signOutCurrentUser = async (): Promise<void> => {
    await signOut();
};
