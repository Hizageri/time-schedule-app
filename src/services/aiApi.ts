import type { CourseData, AppState } from '../types';
import { getCurrentIdToken, signOutCurrentUser } from '../lib/firebase';

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

/** AI 窓口に送るプロフィール。サーバーが使う項目だけ（入学・卒業予定年月などは送らない） */
type ApiProfile = Pick<AppState['userProfile'], 'nickname' | 'dreamJob' | 'university'>;
type ApiProfileWithScale = ApiProfile & Pick<AppState['userProfile'], 'gradingScale'>;

const toApiProfile = ({ nickname, dreamJob, university }: AppState['userProfile']): ApiProfile =>
    ({ nickname, dreamJob, university });

const toApiProfileWithScale = (profile: AppState['userProfile']): ApiProfileWithScale =>
    ({ ...toApiProfile(profile), gradingScale: profile.gradingScale });

/** ログインが切れていて AI 窓口に断られた（ログアウト済み。ログイン画面に戻る） */
export class AuthRequiredError extends Error {}

/**
 * AI 窓口を ID トークン付きで呼ぶ。
 * 401（ログインが切れている）・トークンが取れないときはログアウトさせて AuthRequiredError、
 * それ以外の失敗（400・410・500・503・通信の失敗）はコマどり先輩の口調の文面の Error にする
 */
const postToApi = async <T>(path: string, body: unknown): Promise<T> => {
    const token = await getCurrentIdToken().catch(() => null);
    if (!token) {
        await signOutCurrentUser().catch(() => undefined);
        throw new AuthRequiredError(API_ERROR_MESSAGE);
    }

    const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
    }).catch(() => {
        throw new Error(API_ERROR_MESSAGE);
    });

    if (response.status === 401) {
        await signOutCurrentUser().catch(() => undefined);
        throw new AuthRequiredError(API_ERROR_MESSAGE);
    }
    if (!response.ok) {
        throw new Error(API_ERROR_MESSAGE);
    }

    // 本文が JSON でない（途中で切れたなど）ときも、同じ先輩の口調の文面にする
    return (response.json() as Promise<T>).catch(() => {
        throw new Error(API_ERROR_MESSAGE);
    });
};

export const generateConsultation = (
    userProfile: AppState['userProfile'],
    courses: CourseData[]
): Promise<ConsultationResponse> =>
    postToApi<ConsultationResponse>('/api/consultation', { userProfile: toApiProfile(userProfile), courses });

export const generateTimetablePatterns = (
    courses: CourseData[],
    baseClass: string,
    pinnedClasses: AppState['pinnedClasses']
): Promise<TimetablePatternsResponse> =>
    postToApi<TimetablePatternsResponse>('/api/timetable-patterns', { courses, baseClass, pinnedClasses });

export const generateGradeReaction = (
    userProfile: AppState['userProfile'],
    grades: GradeInput[]
): Promise<GradeReactionResponse> =>
    postToApi<GradeReactionResponse>('/api/grade-reaction', { userProfile: toApiProfileWithScale(userProfile), grades });
