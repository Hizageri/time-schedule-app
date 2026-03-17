import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppState } from './types';
import { defaultState } from './types';

interface AppContextType {
    state: AppState;
    setState: React.Dispatch<React.SetStateAction<AppState>>;
    updateProfile: (profile: Partial<AppState['userProfile']>) => void;
    updateSettings: (settings: Partial<AppState['timetableSettings']>) => void;
    updateConditions: (conditions: Partial<AppState['timetableConditions']>) => void;
    toggleSelectedCourse: (course: any) => void;
    setCommittedClasses: (classes: AppState['committedClasses']) => void;
    setScreen: (screen: AppState['currentScreen']) => void;
    saveGrade: (courseId: string, gradeData: { grade: string, classDifficulty: number, testDifficulty: number }) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AppState>(defaultState);

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

    const setScreen = (screen: AppState['currentScreen']) => {
        setState(prev => ({ ...prev, currentScreen: screen }));
    };

    const saveGrade = (courseId: string, gradeData: { grade: string, classDifficulty: number, testDifficulty: number }) => {
        setState(prev => ({
            ...prev,
            grades: { ...prev.grades, [courseId]: gradeData }
        }));
    };

    return (
        <AppContext.Provider value={{ state, setState, updateProfile, updateSettings, updateConditions, toggleSelectedCourse, setCommittedClasses, setScreen, saveGrade }}>
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
