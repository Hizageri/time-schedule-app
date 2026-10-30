import type { AppState, CourseData } from '../types';
import { getTargetGrades, isInSessionTerm, isRetakeCourse } from './targetBit';
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
    const bit = course.target_bit ?? course.classes[0]?.target_bit ?? 0;
    const targetGrades = getTargetGrades(bit);
    const maxGrade = Math.max(...targetGrades, 0);

    // まだ合格しておらず、現在の学年が推奨学年の上限を超えている
    return currentGrade > maxGrade;
};

export const filterByBit = (
    allCourses: CourseData[],
    filters: {
        selectedGrade: number,
        term: 'first' | 'second' | 'full',
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
        const checkMatch = (bit: number | undefined) => {
            if (bit === undefined) return false;

            // 通常：指定した学年が含まれているか
            // 再履修のみ：ユーザーの成績と年次を元に判定
            const gradeMatch = isReRegistrationOnly
                ? isRetakeCandidate(course, userGrades, earnedCredits, gradingScale, selectedGrade)
                : (bit & (1 << (selectedGrade - 1))) > 0;

            return gradeMatch && isInSessionTerm(bit, term);
        };

        // 1. コース直下にビットがあるかチェック
        if (checkMatch(course.target_bit)) return true;

        // 2. ひとつでも条件に合うクラス(C1, C2など)があるかチェック
        return course.classes.some(c => checkMatch(c.target_bit));

    }).sort((a, b) => {
        // ソート用のビット取得（外側になければ最初のクラスのビットを代用）
        const aBit = a.target_bit ?? a.classes[0]?.target_bit ?? 0;
        const bBit = b.target_bit ?? b.classes[0]?.target_bit ?? 0;

        const aRetake = isRetakeCourse(aBit) ? 1 : 0;
        const bRetake = isRetakeCourse(bBit) ? 1 : 0;

        if (aRetake !== bRetake) return bRetake - aRetake;

        const minGradeA = Math.min(...getTargetGrades(aBit));
        const minGradeB = Math.min(...getTargetGrades(bBit));
        return Math.abs(minGradeA - selectedGrade) - Math.abs(minGradeB - selectedGrade);
    });
};
