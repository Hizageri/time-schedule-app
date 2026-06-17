import type { CourseData, AppState } from '../logic/types';

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

export const generateConsultation = async (
    userProfile: AppState['userProfile'],
    courses: CourseData[]
): Promise<ConsultationResponse> => {
    const response = await fetch('/api/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userProfile, courses }),
    });

    if (!response.ok) {
        throw new Error('AI consultation request failed');
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
    });

    if (!response.ok) {
        throw new Error('AI timetable generation request failed');
    }

    return response.json() as Promise<TimetablePatternsResponse>;
};

export const generateGradeReaction = async (
    userProfile: AppState['userProfile'],
    grades: GradeInput[]
): Promise<string> => {
    const response = await fetch('/api/grade-reaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userProfile, grades }),
    });

    if (!response.ok) {
        throw new Error('AI grade reaction request failed');
    }

    const data = await response.json() as { reaction: string };
    return data.reaction;
};