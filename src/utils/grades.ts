import type { AppState } from '../types';

/** 成績の段階のポイントが合格かどうか（0 は不合格、0 より大きければ合格） */
export const isPassingGradePoint = (point: number): boolean => point > 0;

// 成績のラベルから、成績の段階（gradingScale）でのポイントを引く。段階にないラベルは undefined
const getGradePoint = (
    courseId: string,
    userGrades: AppState['grades'],
    gradingScale: AppState['userProfile']['gradingScale']
): number | undefined => {
    const label = userGrades[courseId]?.grade;
    if (!label) return undefined;
    return gradingScale.find(s => s.label === label)?.point;
};

/**
 * 科目に合格しているかを判定する。
 * 修得済みの一覧（新学期へ進むときに合格科目が入る）と、今の成績の記録の両方を見る。
 * 合否は大学ごとの成績の段階のポイントで決める（0 = 不合格）。成績のラベルは決め打ちにしない
 */
export const isCoursePassed = (
    courseId: string,
    userGrades: AppState['grades'],
    earnedCredits: AppState['earnedCredits'],
    gradingScale: AppState['userProfile']['gradingScale']
): boolean => {
    if ((earnedCredits ?? []).some(e => e.courseId === courseId)) return true;
    const point = getGradePoint(courseId, userGrades, gradingScale);
    return point !== undefined && isPassingGradePoint(point);
};

/** 成績が記録されていて、不合格（ポイント 0）の科目かを判定する */
export const isCourseFailed = (
    courseId: string,
    userGrades: AppState['grades'],
    gradingScale: AppState['userProfile']['gradingScale']
): boolean => {
    const point = getGradePoint(courseId, userGrades, gradingScale);
    return point !== undefined && !isPassingGradePoint(point);
};
