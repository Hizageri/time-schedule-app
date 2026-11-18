// 成績の段階と合否。成績の段階は保存データ（userProfile.gradingScale）ではなく、今の大学の設定から読む
import type { AppState } from '../types';
import { currentUniversity } from '../config/currentUniversity';

/** 成績の段階のポイントが合格かどうか（0 は不合格、0 より大きければ合格） */
export const isPassingGradePoint = (point: number): boolean => point > 0;

/** 今の大学の成績の段階 */
export const getGradingScale = (): AppState['userProfile']['gradingScale'] => currentUniversity.gradingScale;

/** 保存データの成績のラベルを、今の大学の段階のラベルに読みかえる（会津大学：D → F）。読みかえがなければそのまま */
export const toScaleLabel = (label: string): string => currentUniversity.gradeAliases[label] ?? label;

/** 成績のラベルのポイント（読みかえてから段階を引く）。段階にないラベルは undefined */
export const getGradeLabelPoint = (label: string): number | undefined =>
    currentUniversity.gradingScale.find(s => s.label === toScaleLabel(label))?.point;

// 科目の成績のポイント。成績がない・段階にないラベルは undefined
const getGradePoint = (courseId: string, userGrades: AppState['grades']): number | undefined => {
    const label = userGrades[courseId]?.grade;
    if (!label) return undefined;
    return getGradeLabelPoint(label);
};

/**
 * 科目に合格しているかを判定する。
 * 修得済みの一覧（新学期へ進むときに合格科目が入る）と、今の成績の記録の両方を見る。
 * 合否は大学ごとの成績の段階のポイントで決める（0 = 不合格）。成績のラベルは決め打ちにしない
 */
export const isCoursePassed = (
    courseId: string,
    userGrades: AppState['grades'],
    earnedCredits: AppState['earnedCredits']
): boolean => {
    if ((earnedCredits ?? []).some(e => e.courseId === courseId)) return true;
    const point = getGradePoint(courseId, userGrades);
    return point !== undefined && isPassingGradePoint(point);
};

/** 成績が記録されていて、不合格（ポイント 0）の科目かを判定する */
export const isCourseFailed = (courseId: string, userGrades: AppState['grades']): boolean => {
    const point = getGradePoint(courseId, userGrades);
    return point !== undefined && !isPassingGradePoint(point);
};
