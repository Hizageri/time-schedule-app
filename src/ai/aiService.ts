import type { CourseData, AppState } from '../logic/types';

// /api/* 自体が失敗したとき（タイムアウト・通信断など）のコマどり先輩の返答
// api/_lib/geminiRetry.ts の GENERAL_ERROR_MESSAGE と同じ文言（api/ と src/ は互いに import しない）
const API_ERROR_MESSAGE = 'なんか調子が悪いみてえだ。時間をおいて出直してこい';

export interface ConsultationResponse {
    overallFeedback: string;
    courseFeedbacks: {
        courseId: string;
        courseName: string;
        comment: string;
    }[];
}

export interface TimetablePatternsResponse {
    patterns: {
        id: string;
        name: string;
        description: string;
        assignments: {
            courseId: string;
            classId: string;
        }[];
    }[];
}

export interface GradeInput {
    courseId: string;
    courseName: string;
    grade: string;
    credits: number;
}

export interface GradeReactionResponse {
    title: string;
    message: string;
}

export const generateConsultation = async (
    userProfile: AppState['userProfile'],
    courses: CourseData[]
): Promise<ConsultationResponse> => {
    const response = await fetch('/api/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userProfile, courses }),
    }).catch(() => {
        throw new Error(API_ERROR_MESSAGE);
    });

    if (!response.ok) {
        throw new Error(API_ERROR_MESSAGE);
    }

    return response.json() as Promise<ConsultationResponse>;
};

export const generateTimetablePatterns = async (
    courses: CourseData[],
    baseClass: string
): Promise<TimetablePatternsResponse> => {
    const response = await fetch('/api/timetable-patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courses, baseClass }),
    }).catch(() => {
        throw new Error(API_ERROR_MESSAGE);
    });

    if (!response.ok) {
        throw new Error(API_ERROR_MESSAGE);
    }

    return response.json() as Promise<TimetablePatternsResponse>;
};

export const generateGradeReaction = async (
    userProfile: AppState['userProfile'],
    grades: GradeInput[]
): Promise<GradeReactionResponse> => {
    const response = await fetch('/api/grade-reaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userProfile, grades }),
    }).catch(() => {
        throw new Error(API_ERROR_MESSAGE);
    });

    if (!response.ok) {
        throw new Error(API_ERROR_MESSAGE);
    }

    return response.json() as Promise<GradeReactionResponse>;
};