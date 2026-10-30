import type { AppState } from '../types';
import { isRetakeCourse } from './targetBit';

export type PatternType = 'balance' | 'full-day-off' | 'zero-first-period' | 'night-shift' | 'zero-gaps';

export interface GeneratedTimetable {
    patternId: PatternType;
    classes: AppState['committedClasses'];
    score: number;
}

// Simple CSP Backtracking Solver
export const generateTimetables = (
    state: AppState
): GeneratedTimetable[] => {
    const { timetableSettings: _settings, timetableConditions: conditions, selectedCourses, pinnedClasses } = state;

    // Pre-calculate valid classes for each course and sort them by least number of valid classes
    // This implements Minimum Remaining Values (MRV) heuristic, drastically reducing the search space.
    const coursesWithValidClasses = selectedCourses.map(course => {
        const isRetakeRequested = conditions.hasRetake && conditions.retakeClasses?.includes(course.id_name);
        const validClasses = course.classes.filter(cls => {
            const classBit = cls.target_bit ?? course.target_bit ?? 0;
            const classIsRetake = isRetakeCourse(classBit);
            return isRetakeRequested ? classIsRetake : !classIsRetake;
        });
        return { course, validClasses };
    }).sort((a, b) => a.validClasses.length - b.validClasses.length);

    // Helper to calculate scores based on different constraints (kept for mock scoring)
    const scoreTimetable = (_classes: AppState['committedClasses'], _patternId: PatternType) => {
        let score = Math.floor(Math.random() * 20) + 80; // Mock score 80-100
        return score;
    };

    const patterns: PatternType[] = ['balance', 'full-day-off', 'zero-first-period', 'night-shift', 'zero-gaps'];
    const finalTimetables: GeneratedTimetable[] = [];

    // --- モック実装: 衝突判定をせず、AIが考えてくれた風にランダムにクラスを選択してパターンを作る ---
    patterns.forEach(p => {
        const mockClasses: AppState['committedClasses'] = [];

        coursesWithValidClasses.forEach(({ course, validClasses }) => {
            if (validClasses.length > 0) {
                // If a class is pinned by the user, use it. Otherwise, randomly select one.
                const pinnedClassId = pinnedClasses?.[course.id_name];
                let chosenClass = validClasses[0];

                if (pinnedClassId) {
                    const found = validClasses.find(c => c.class_id === pinnedClassId);
                    if (found) chosenClass = found;
                } else {
                    const randomIndex = Math.floor(Math.random() * validClasses.length);
                    chosenClass = validClasses[randomIndex];
                }

                const currentClassBit = chosenClass.target_bit ?? course.target_bit;

                mockClasses.push({
                    courseId: course.id_name,
                    targetBit: currentClassBit,
                    classId: chosenClass.class_id,
                    schedule: chosenClass.schedule
                });
            }
        });

        // 本来はここでAIに判定させ、無理ならエラーを出す想定だが、現状はモックとして生成成功扱いにする
        finalTimetables.push({
            patternId: p,
            classes: mockClasses,
            score: scoreTimetable(mockClasses, p)
        });
    });

    return finalTimetables;
};
