// 画面3（科目選択）の裏側の処理：受講できる科目の一覧、選択単位数、上限つきの選択
import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { MOCK_COURSES } from '../data';
import type { CourseData } from '../types';
import { filterByBit, isRetakeCandidate } from '../utils/courseFilter';
import { isCoursePassed } from '../utils/grades';
import { isInSessionTerm } from '../utils/targetBit';
import { MAX_SELECTED_COURSES } from '../config/inputLimits';

export function useAvailableCourses(): {
    currentCourses: CourseData[];
    earlierCourses: CourseData[];
    /** 選んだ科目の単位数（合格済みの科目は数えない） */
    selectedCredits: number;
    /** 選ぶ・外す。まだ選んでいない科目を、すでに上限まで選んでいるときは選ばずに知らせの文言を返す */
    toggleCourse: (course: CourseData) => { ok: true } | { ok: false; message: string };
} {
    const { state, toggleSelectedCourse } = useAppContext();

    // 今の学年の科目（currentCourses）と、下の学年でまだ合格していない科目（earlierCourses）に分けて出す
    const { currentCourses, earlierCourses } = useMemo(() => {
        const baseFiltered = filterByBit(MOCK_COURSES, {
            selectedGrade: state.timetableConditions.targetGrade,
            term: state.timetableConditions.term,
            isReRegistrationOnly: state.timetableConditions.hasRetake,
            userGrades: state.grades,
            earnedCredits: state.earnedCredits,
            gradingScale: state.userProfile.gradingScale
        });

        // 再履修・未履修の自動抽出

        const reRegistrationCourses = MOCK_COURSES.filter(c => {
            // 既に基本フィルターに含まれているならスキップ
            if (baseFiltered.some(bc => bc.id_name === c.id_name)) return false;

            // 共通ユーティリティで判定
            const isCandidate = isRetakeCandidate(
                c,
                state.grades,
                state.earnedCredits,
                state.userProfile.gradingScale,
                state.timetableConditions.targetGrade
            );
            if (!isCandidate) return false;

            // 学期（前期／後期など）が一致しているか判定
            const checkTermMatch = (b: number | undefined) => {
                if (b === undefined) return false;
                return isInSessionTerm(b, state.timetableConditions.term);
            };

            return checkTermMatch(c.target_bit) || c.classes.some(cls => checkTermMatch(cls.target_bit));
        });

        // 既に合格済みのものは filterByBit や isRetakeCandidate 側で除外済み
        return { currentCourses: baseFiltered, earlierCourses: reRegistrationCourses };
    }, [state.timetableConditions, state.grades, state.earnedCredits, state.userProfile.gradingScale]);

    const selectedCredits = state.selectedCourses.reduce((sum, c) => {
        const isPassed = isCoursePassed(c.id_name, state.grades, state.earnedCredits, state.userProfile.gradingScale);
        return sum + (isPassed ? 0 : c.credits);
    }, 0);

    const toggleCourse = (course: CourseData): { ok: true } | { ok: false; message: string } => {
        const isSelected = state.selectedCourses.some(c => c.id_name === course.id_name);
        if (!isSelected && state.selectedCourses.length >= MAX_SELECTED_COURSES) {
            return { ok: false, message: `一度に選べるのは ${MAX_SELECTED_COURSES} 科目までです` };
        }
        toggleSelectedCourse(course);
        return { ok: true };
    };

    return { currentCourses, earlierCourses, selectedCredits, toggleCourse };
}
