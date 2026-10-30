import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { AppState } from '../types';
import { isCoursePassed } from '../utils/grades';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { useUserDataSync } from '../hooks/useUserDataSync';
import type { LoadStatus } from '../hooks/useUserDataSync';

export type { LoadStatus };

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
    const { user, authLoading, loadStatus, state, setState, signOutAfterSaving } = useUserDataSync();

    const logout = signOutAfterSaving;

    const loginWithGoogle = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (err) {
            // 利用者が Google のポップアップを自分で閉じた（または二重に開こうとした）だけなら、失敗として扱わない
            const code = (err as { code?: unknown }).code;
            if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
            console.error("Google sign-in error:", err);
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
            // 名前の一部が重なる別の科目を消さないよう、ID が一致するものだけを消す
            selectedCourses: prev.selectedCourses.filter(c => c.id_name !== courseId)
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

            Object.keys(prev.grades).forEach((courseId) => {
                // 修得済みに加えるのは、共通の合否の判定で合格した科目だけ
                if (isCoursePassed(courseId, prev.grades, existingEarned, prev.userProfile.gradingScale)) {
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
