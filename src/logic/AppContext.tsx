import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { AppState } from './types';
import { defaultState } from './types';
import { auth, db, googleProvider } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

/** 最後の変更からこの時間がたったら、まとめて1回保存する */
const SAVE_DEBOUNCE_MS = 3000;
/** ログアウトの前に保存の完了を待つ最大の時間（通信できないときにログアウトが止まらないように） */
const LOGOUT_SAVE_WAIT_MS = 3000;

/** 保存データの読み込みの状態。'ready' のときだけ保存する */
export type LoadStatus = 'signedOut' | 'loading' | 'ready' | 'error';

interface AppContextType {
    user: User | null;
    authLoading: boolean;
    loadStatus: LoadStatus;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    state: AppState;
    setState: React.Dispatch<React.SetStateAction<AppState>>;
    updateProfile: (profile: Partial<AppState['userProfile']>) => void;
    updateSettings: (settings: Partial<AppState['timetableSettings']>) => void;
    updateConditions: (conditions: Partial<AppState['timetableConditions']>) => void;
    toggleSelectedCourse: (course: any) => void;
    setCommittedClasses: (classes: AppState['committedClasses']) => void;
    removeCommittedClass: (courseId: string, classId: string) => void;
    setScreen: (screen: AppState['currentScreen']) => void;
    saveGrade: (courseId: string, gradeData: { grade: string, classDifficulty: number, testDifficulty: number }) => void;
    pinClass: (courseId: string, classId: string | null) => void;
    updateClassroomName: (slotKey: string, classroomName: string) => void;
    resetTermData: () => void;
    startNewSemester: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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

    const loginWithGoogle = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (err) {
            console.error("Google sign-in error:", err);
            throw err;
        }
    };

    const logout = async () => {
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

    const updateProfile = (profile: Partial<AppState['userProfile']>) => {
        setState(prev => ({ ...prev, userProfile: { ...prev.userProfile, ...profile } }));
    };

    const updateSettings = (settings: Partial<AppState['timetableSettings']>) => {
        setState(prev => ({ ...prev, timetableSettings: { ...prev.timetableSettings, ...settings } }));
    };

    const updateConditions = (conditions: Partial<AppState['timetableConditions']>) => {
        setState(prev => ({ ...prev, timetableConditions: { ...prev.timetableConditions, ...conditions } }));
    };

    const toggleSelectedCourse = (course: any) => {
        setState(prev => {
            const isSelected = prev.selectedCourses.some(c => c.id_name === course.id_name);
            if (isSelected) {
                return { ...prev, selectedCourses: prev.selectedCourses.filter(c => c.id_name !== course.id_name) };
            } else {
                return { ...prev, selectedCourses: [...prev.selectedCourses, course] };
            }
        });
    };

    const setCommittedClasses = (classes: AppState['committedClasses']) => {
        setState(prev => ({ ...prev, committedClasses: classes }));
    };

    const removeCommittedClass = (courseId: string, classId: string) => {
        setState(prev => ({
            ...prev,
            committedClasses: prev.committedClasses.filter(
                c => !(c.courseId === courseId && c.classId === classId)
            ),
            selectedCourses: prev.selectedCourses.filter(
                c => c.id_name !== courseId && !courseId.includes(c.id_name) && !c.id_name.includes(courseId)
            )
        }));
    };

    const setScreen = (screen: AppState['currentScreen']) => {
        setState(prev => ({ ...prev, currentScreen: screen }));
    };

    const saveGrade = (courseId: string, gradeData: { grade: string, classDifficulty: number, testDifficulty: number }) => {
        setState(prev => ({
            ...prev,
            grades: { ...prev.grades, [courseId]: gradeData }
        }));
    };

    const pinClass = (courseId: string, classId: string | null) => {
        setState(prev => {
            const newPinned = { ...prev.pinnedClasses };
            if (classId === null) {
                delete newPinned[courseId];
            } else {
                newPinned[courseId] = classId;
            }
            return { ...prev, pinnedClasses: newPinned };
        });
    };

    const updateClassroomName = (slotKey: string, classroomName: string) => {
        setState(prev => ({
            ...prev,
            classroomNames: { ...prev.classroomNames, [slotKey]: classroomName }
        }));
    };

    const resetTermData = () => {
        setState(prev => ({
            ...prev,
            selectedCourses: [],
            committedClasses: [],
            pinnedClasses: {}
        }));
    };

    const startNewSemester = () => {
        setState(prev => {
            const existingEarned = prev.earnedCredits || [];
            const newEarnedEntries: { courseId: string; courseName: string }[] = [...existingEarned];

            Object.entries(prev.grades).forEach(([courseId, gradeInfo]) => {
                const gradeLabel = gradeInfo.grade;
                if (!gradeLabel) return;

                const scale = prev.userProfile.gradingScale.find(s => s.label === gradeLabel);
                const isFailed = scale ? scale.point === 0 : (gradeLabel === 'F' || gradeLabel === 'D' || gradeLabel === '不可');

                if (!isFailed) {
                    const alreadyExists = newEarnedEntries.some(e => e.courseId === courseId);
                    if (!alreadyExists) {
                        const courseObj = prev.selectedCourses.find(c => c.id_name === courseId);
                        newEarnedEntries.push({
                            courseId: courseId,
                            courseName: courseObj ? courseObj.id_name : courseId
                        });
                    }
                }
            });

            const nextTerm = prev.timetableConditions.term === 'first' ? 'second' : 'first';
            const nextGrade = prev.timetableConditions.term === 'second'
                ? Math.min(6, prev.timetableConditions.targetGrade + 1)
                : prev.timetableConditions.targetGrade;

            return {
                ...prev,
                currentScreen: 2,
                selectedCourses: [],
                committedClasses: [],
                grades: {},
                pinnedClasses: {},
                classroomNames: {},
                earnedCredits: newEarnedEntries,
                timetableConditions: {
                    ...prev.timetableConditions,
                    term: nextTerm,
                    targetGrade: nextGrade
                }
            };
        });
    };

    return (
        <AppContext.Provider value={{
            user,
            authLoading,
            loadStatus,
            loginWithGoogle,
            logout,
            state,
            setState,
            updateProfile,
            updateSettings,
            updateConditions,
            toggleSelectedCourse,
            setCommittedClasses,
            removeCommittedClass,
            setScreen,
            saveGrade,
            pinClass,
            updateClassroomName,
            resetTermData,
            startNewSemester
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
