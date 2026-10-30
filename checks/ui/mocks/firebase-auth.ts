// firebase/auth の偽物
import { h } from '../setup';

export class GoogleAuthProvider {
    setCustomParameters(): void {}
}
export const getAuth = () => ({});
export const onAuthStateChanged = (_auth: unknown, cb: (user: unknown) => void) => {
    h.authCb = cb;
    setTimeout(() => cb(h.currentUser), 0);
    return () => {
        h.authCb = null;
    };
};
export const signInWithPopup = async () => {
    if (h.popupErrorCode) {
        throw Object.assign(new Error('Firebase: Error (' + h.popupErrorCode + ').'), { code: h.popupErrorCode, name: 'FirebaseError' });
    }
    h.login('userA');
};
export const signOut = async () => {
    h.currentUser = null;
    setTimeout(() => h.authCb?.(null), 0);
};
export type User = { uid: string };
