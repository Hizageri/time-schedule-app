import type { AppState, CourseData } from '../types';
import type { CourseConditions } from '../types';
import { getCourseConditions, includesGrade, isRetake, matchesTerm } from './courseConditions';
import type { Term } from './courseConditions';
import { isCourseFailed, isCoursePassed } from './grades';

/**
 * 判断科目が「再履修・未履修」の対象候補かどうかを判定する
 */
export const isRetakeCandidate = (
    course: CourseData,
    userGrades: AppState['grades'],
    earnedCredits: AppState['earnedCredits'],
    gradingScale: AppState['userProfile']['gradingScale'],
    currentGrade: number
): boolean => {
    // 1. 「OT」から始まる教養科目を完全に除外する
    if (course.id_name.startsWith('OT')) return false;

    // 2. 合格済み（修得済みの一覧または成績の記録）なら除外。不合格なら確定で再履修対象
    if (isCoursePassed(course.id_name, userGrades, earnedCredits, gradingScale)) return false;
    if (isCourseFailed(course.id_name, userGrades, gradingScale)) return true;

    // 3. 履修年次を過ぎているか判定
    const targetGrades = getCourseConditions(course)?.grades ?? [];
    const maxGrade = Math.max(...targetGrades, 0);

    // まだ合格しておらず、現在の学年が推奨学年の上限を超えている
    return currentGrade > maxGrade;
};

/** 今の学年・学期で受講できる科目（共通の形の条件で判定する）。合格済みの科目は出さない */
export const filterAvailableCourses = (
    allCourses: CourseData[],
    filters: {
        selectedGrade: number,
        term: Term,
        isReRegistrationOnly: boolean,
        userGrades: AppState['grades'],
        earnedCredits: AppState['earnedCredits'],
        gradingScale: AppState['userProfile']['gradingScale']
    }
): CourseData[] => {
    const { selectedGrade, term, isReRegistrationOnly, userGrades, earnedCredits, gradingScale } = filters;

    return allCourses.filter(course => {
        // 合格済みの科目は一覧に出さない
        if (isCoursePassed(course.id_name, userGrades, earnedCredits, gradingScale)) return false;

        // --- 判定ロジック ---
        const checkMatch = (conditions: CourseConditions | undefined) => {
            if (conditions === undefined) return false;

            // 通常：指定した学年が含まれているか
            // 再履修のみ：ユーザーの成績と年次を元に判定
            const gradeMatch = isReRegistrationOnly
                ? isRetakeCandidate(course, userGrades, earnedCredits, gradingScale, selectedGrade)
                : includesGrade(conditions, selectedGrade);

            return gradeMatch && matchesTerm(conditions, term);
        };

        // 1. 科目の条件があるかチェック
        if (checkMatch(course.conditions)) return true;

        // 2. ひとつでも条件に合うクラス(C1, C2など)があるかチェック
        return course.classes.some(c => checkMatch(c.conditions));

    }).sort((a, b) => {
        // 並べ替え用の条件（科目になければ最初のクラスの条件を代用）
        const aConditions = getCourseConditions(a);
        const bConditions = getCourseConditions(b);

        const aRetake = aConditions && isRetake(aConditions) ? 1 : 0;
        const bRetake = bConditions && isRetake(bConditions) ? 1 : 0;

        if (aRetake !== bRetake) return bRetake - aRetake;

        const minGradeA = Math.min(...(aConditions?.grades ?? []));
        const minGradeB = Math.min(...(bConditions?.grades ?? []));
        return Math.abs(minGradeA - selectedGrade) - Math.abs(minGradeB - selectedGrade);
    });
};
