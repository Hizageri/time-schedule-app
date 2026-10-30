import type { AppState } from '../types';

export const defaultState: AppState = {
    currentScreen: 1,
    userProfile: {
        nickname: '',
        university: '会津大学',
        dreamJob: '',
        gradingScale: [
            { label: 'A', point: 4 },
            { label: 'B', point: 3 },
            { label: 'C', point: 2 },
            { label: 'D', point: 0 },
            { label: 'F', point: 0 }
        ],
        termSystem: '4学期制',
        enrollmentYearMonth: '',
        expectedGraduationYearMonth: ''
    },
    timetableSettings: {
        workingDays: 5,
        maxPeriods: 5
    },
    timetableConditions: {
        targetGrade: 1,
        term: 'first',
        hasRetake: false,
        retakeClasses: [],
        baseClass: 'C1'
    },
    selectedCourses: [],
    committedClasses: [],
    grades: {},
    earnedCredits: [],
    pinnedClasses: {},
    classroomNames: {}
};
