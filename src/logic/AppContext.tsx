import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AppState } from './types';
import { defaultState } from './types';
import { auth, db, googleProvider } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AppContextType {
    user: User | null;
    authLoading: boolean;
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
    const [state, setState] = useState<AppState>(defaultState);

    // Listen to Firebase Auth state
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                try {
                    // Sync from Firestore when user logs in
                    const userDocRef = doc(db, 'users', currentUser.uid);
                    const docSnap = await getDoc(userDocRef);
                    if (docSnap.exists()) {
                        const remoteData = docSnap.data();
                        const mergedState: AppState = {
                            ...defaultState,
                            ...remoteData,
                            userProfile: { ...defaultState.userProfile, ...(remoteData.userProfile || {}) },
                            timetableSettings: { ...defaultState.timetableSettings, ...(remoteData.timetableSettings || {}) },
                            timetableConditions: { ...defaultState.timetableConditions, ...(remoteData.timetableConditions || {}) },
                        };
                        if (mergedState.committedClasses && mergedState.committedClasses.length > 0 && (mergedState.currentScreen === 1 || mergedState.currentScreen === 5)) {
                            mergedState.currentScreen = 6;
                        }
                        setState(mergedState);
                    } else {
                        // Document doesn't exist yet, seed with initial state
                        await setDoc(userDocRef, state);
                    }
                } catch (err) {
                    console.error("Failed to sync state from Firestore:", err);
                }
            } else {
                // Logged out: reset in-memory state to defaultState
                setState(defaultState);
            }
            setAuthLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Synchronize State with Firestore whenever state changes
    useEffect(() => {
        if (!user) return; // Only persist when authenticated

        const userDocRef = doc(db, 'users', user.uid);
        setDoc(userDocRef, state, { merge: true }).catch((err) => {
            console.error("Failed to sync state to Firestore:", err);
        });
    }, [state, user]);

    const loginWithGoogle = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (err) {
            console.error("Google sign-in error:", err);
            throw err;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            setUser(null);
            setState(defaultState);
        } catch (err) {
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
