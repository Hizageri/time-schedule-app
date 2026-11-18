import type { AppState } from '../types';
import { currentUniversity } from '../config/currentUniversity';

// 大学名・学期制・成績の段階・学年・ベースクラスの初期値は、今の大学の設定から作る
export const defaultState: AppState = {
    currentScreen: 1,
    userProfile: {
        nickname: '',
        university: currentUniversity.name,
        dreamJob: '',
        gradingScale: currentUniversity.gradingScale.map(s => ({ ...s })),
        termSystem: currentUniversity.termSystemLabel,
        enrollmentYearMonth: '',
        expectedGraduationYearMonth: ''
    },
    timetableSettings: {
        workingDays: 5,
        maxPeriods: 5
    },
    timetableConditions: {
        targetGrade: currentUniversity.gradeRange.min,
        term: 'first',
        hasRetake: false,
        retakeClasses: [],
        baseClass: currentUniversity.baseClasses[0]?.options[0] ?? ''
    },
    selectedCourses: [],
    committedClasses: [],
    grades: {},
    earnedCredits: [],
    pinnedClasses: {},
    classroomNames: {}
};
