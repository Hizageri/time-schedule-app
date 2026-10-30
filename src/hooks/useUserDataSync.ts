// 保存データの同期：認証の監視・読み込みの状態・3秒まとめた保存・すぐ書く保存・ログアウトの前の保存
// （2026-10-30 に context/AppContext.tsx から、並びとタイミングを変えずに移した）
import type React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { AppState } from '../types';
import { defaultState } from '../context/defaultState';
import { auth, db } from '../lib/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

/** 最後の変更からこの時間がたったら、まとめて1回保存する */
const SAVE_DEBOUNCE_MS = 3000;
/** ログアウトの前に保存の完了を待つ最大の時間（通信できないときにログアウトが止まらないように） */
const LOGOUT_SAVE_WAIT_MS = 3000;

/** 保存データの読み込みの状態。'ready' のときだけ保存する */
export type LoadStatus = 'signedOut' | 'loading' | 'ready' | 'error';

export function useUserDataSync(): {
    user: User | null;
    authLoading: boolean;
    loadStatus: LoadStatus;
    state: AppState;
    setState: React.Dispatch<React.SetStateAction<AppState>>;
    /** 保存を止め、待っている保存を（最大 LOGOUT_SAVE_WAIT_MS）書いてからログアウトする。失敗したら保存を元に戻して投げ直す */
    signOutAfterSaving: () => Promise<void>;
} {
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState<boolean>(true);
    const [loadStatus, setLoadStatus] = useState<LoadStatus>('signedOut');
    const [state, setState] = useState<AppState>(defaultState);
    // 保存してよい利用者（読み込みが終わった利用者）の uid。ログアウトや利用者の切り替えで、描画を待たずにすぐ null にする
    const readyUidRef = useRef<string | null>(null);
    // 読み込みで入れた状態。これと同じ状態は保存しない（ログイン直後に保存が走らないように）
    const loadedStateRef = useRef<AppState | null>(null);
    // 読み込みの番号。読み込み中に利用者が変わったら、古い読み込みの結果を捨てる
    const loadSeqRef = useRef(0);
    // 待っている保存。予約した時点の利用者の分として書く
    const pendingSaveRef = useRef<{ uid: string; state: AppState } | null>(null);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /**
     * 待っている保存をすぐ行う。保存データは状態そのもので書き直す（merge なし：消した項目は保存データからも消える）。
     * 書き込みが終わったら（失敗しても）解決する。失敗は開発者ツールに記録するだけで、画面は止めない
     */
    const flushSave = useCallback((): Promise<void> => {
        if (saveTimerRef.current !== null) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
        }
        const pending = pendingSaveRef.current;
        pendingSaveRef.current = null;
        if (!pending) return Promise.resolve();
        // setDoc はデータの検査エラーを同期的に投げるため、.catch() だけでなく try/catch でも受け止める
        // （受け止めないとエラーが外に漏れ、アプリ全体が真っ白になる）
        try {
            return setDoc(doc(db, 'users', pending.uid), pending.state).catch((err) => {
                console.error("Failed to save state to Firestore:", err);
            });
        } catch (err) {
            console.error("Failed to save state to Firestore:", err);
            return Promise.resolve();
        }
    }, []);

    // Listen to Firebase Auth state
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            const seq = ++loadSeqRef.current;
            // 前の利用者の待っている保存は、前の利用者の分として先に書く。前の利用者の状態を、後の利用者の保存データに書かない
            void flushSave();
            readyUidRef.current = null;
            loadedStateRef.current = null;
            setUser(currentUser);
            setState(defaultState);

            if (!currentUser) {
                setLoadStatus('signedOut');
                setAuthLoading(false);
                return;
            }

            setLoadStatus('loading');
            setAuthLoading(true);
            try {
                const userDocRef = doc(db, 'users', currentUser.uid);
                const docSnap = await getDoc(userDocRef);
                let loadedState: AppState;
                if (docSnap.exists()) {
                    const remoteData = docSnap.data();
                    loadedState = {
                        ...defaultState,
                        ...remoteData,
                        userProfile: { ...defaultState.userProfile, ...(remoteData.userProfile || {}) },
                        timetableSettings: { ...defaultState.timetableSettings, ...(remoteData.timetableSettings || {}) },
                        timetableConditions: { ...defaultState.timetableConditions, ...(remoteData.timetableConditions || {}) },
                    };
                    if (loadedState.committedClasses && loadedState.committedClasses.length > 0 && (loadedState.currentScreen === 1 || loadedState.currentScreen === 5)) {
                        loadedState.currentScreen = 6;
                    }
                } else {
                    // 保存データがまだない：初期値で作る（オンボーディングから始まる）
                    loadedState = defaultState;
                    await setDoc(userDocRef, defaultState);
                }
                if (seq !== loadSeqRef.current) return;
                loadedStateRef.current = loadedState;
                readyUidRef.current = currentUser.uid;
                setState(loadedState);
                setLoadStatus('ready');
            } catch (err) {
                if (seq !== loadSeqRef.current) return;
                // 読み込めなかったときは保存しない（初期値で上書きしないため）
                console.error("Failed to load state from Firestore:", err);
                setLoadStatus('error');
            }
            setAuthLoading(false);
        });

        return () => unsubscribe();
    }, [flushSave]);

    // 読み込みが終わった利用者の状態だけを、最後の変更から SAVE_DEBOUNCE_MS 後にまとめて保存する
    useEffect(() => {
        if (loadStatus !== 'ready' || !user || readyUidRef.current !== user.uid) return;
        if (state === loadedStateRef.current) return; // 読み込んだままの状態は保存しない

        pendingSaveRef.current = { uid: user.uid, state };
        if (saveTimerRef.current !== null) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
    }, [state, user, loadStatus, flushSave]);

    // ページが隠れる・閉じられるときは、待っている保存をすぐ行う
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') void flushSave();
        };
        const handlePageHide = () => {
            void flushSave();
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', handlePageHide);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pagehide', handlePageHide);
            void flushSave();
        };
    }, [flushSave]);

    const signOutAfterSaving = async () => {
        // ここから先の変更と、ログアウト後の初期状態を、この利用者の保存データに書かない（失敗したら元に戻す）
        const readyUid = readyUidRef.current;
        readyUidRef.current = null;
        try {
            // 待っている保存を先に書き、届くのを待ってからログアウトする（ログアウト後の書き込みは断られるため）
            await Promise.race([flushSave(), new Promise<void>(resolve => setTimeout(resolve, LOGOUT_SAVE_WAIT_MS))]);
            await signOut(auth);
            setUser(null);
            setState(defaultState);
        } catch (err) {
            readyUidRef.current = readyUid;
            console.error("Sign-out error:", err);
            throw err;
        }
    };

    return { user, authLoading, loadStatus, state, setState, signOutAfterSaving };
}
