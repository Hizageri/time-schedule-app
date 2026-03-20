// src/timetableGenerator.ts
import type { AppState, CourseData } from './types';

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

    const backtrack = (courseIndex: number, currentSelection: AppState['committedClasses']) => {
        // Return early if we already have enough solutions or reached the end
        if (courseIndex === selectedCourses.length) {
            if (result.length < 50) {
                result.push({
                    patternId: 'balance', // temporary
                    classes: [...currentSelection],
                    score: 0
                });
            }
            return;
        }

        const course = selectedCourses[courseIndex];
        if (course.classes.length === 0) {
            // no valid classes, skip
            backtrack(courseIndex + 1, currentSelection);
            return;
        }

        for (const validClass of course.classes) {
            const scheduleArrays = currentSelection.map(c => c.schedule);
            if (!checkScheduleConflict(scheduleArrays, validClass.schedule)) {
                currentSelection.push({
                    courseId: course.id_name,
                    targetBit: course.target_bit,
                    classId: validClass.class_id,
                    schedule: validClass.schedule
                });
                backtrack(courseIndex + 1, currentSelection);
                currentSelection.pop();
                if (result.length >= 50) return;
            }
        }
    };

    backtrack(0, []);

    if (result.length === 0) return []; // No valid configuration found

    // Generate distinct timetables for each pattern using specialized algorithms
    const finalTimetables: GeneratedTimetable[] = [];
    
    // For each pattern, generate a specialized solution
    const patterns: PatternType[] = ['balance', 'full-day-off', 'zero-first-period', 'night-shift', 'zero-gaps'];
    for (const patternId of patterns) {
        const patternResults: GeneratedTimetable[] = [];
        
        const backtrackWithPattern = (courseIndex: number, currentSelection: AppState['committedClasses']) => {
            if (courseIndex === selectedCourses.length) {
                if (patternResults.length < 10) {
                    const score = scoreTimetable(currentSelection, patternId);
                    patternResults.push({
                        patternId,
                        classes: [...currentSelection],
                        score
                    });
                }
                return;
            }

            const course = selectedCourses[courseIndex];
            if (course.classes.length === 0) {
                backtrackWithPattern(courseIndex + 1, currentSelection);
                return;
            }

            // Sort classes based on pattern preferences
            const sortedClasses = [...course.classes].sort((a, b) => {
                if (patternId === 'zero-first-period') {
                    // Prefer classes not in 1st period
                    const aHasFirst = a.schedule.some(s => s.endsWith('-1'));
                    const bHasFirst = b.schedule.some(s => s.endsWith('-1'));
                    return aHasFirst - bHasFirst;
                }
                if (patternId === 'night-shift') {
                    // Prefer earlier classes
                    const aLatest = Math.max(...a.schedule.map(s => parseInt(s.split('-')[1])));
                    const bLatest = Math.max(...b.schedule.map(s => parseInt(s.split('-')[1])));
                    return aLatest - bLatest;
                }
                if (patternId === 'full-day-off') {
                    // Prefer concentrated schedules
                    const aDays = new Set(a.schedule.map(s => s.split('-')[0]));
                    const bDays = new Set(b.schedule.map(s => s.split('-')[0]));
                    return aDays.size - bDays.size;
                }
                if (patternId === 'zero-gaps') {
                    // Prefer back-to-back classes
                    return 0; // Keep original order for simplicity
                }
                return 0; // balance - keep original order
            });

            for (const validClass of sortedClasses) {
                const scheduleArrays = currentSelection.map(c => c.schedule);
                if (!checkScheduleConflict(scheduleArrays, validClass.schedule)) {
                    currentSelection.push({
                        courseId: course.id_name,
                        targetBit: course.target_bit,
                        classId: validClass.class_id,
                        schedule: validClass.schedule
                    });
                    backtrackWithPattern(courseIndex + 1, currentSelection);
                    currentSelection.pop();
                    if (patternResults.length >= 10) return;
                }
            }
        };

        backtrackWithPattern(0, []);
        
        if (patternResults.length > 0) {
            // Find best solution for this pattern
            const best = patternResults.reduce((best, current) => 
                current.score > best.score ? current : best
            );
            finalTimetables.push(best);
        }
    }
=======
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
>>>>>>> ad878ed61691973d9543e3b97663d7c45a36b789

    return finalTimetables;
};

// --- Bit Decoding and Filtering Utilities ---

export const getTargetGrades = (bit: number): number[] => {
    const grades: number[] = [];
    for (let i = 0; i < 6; i++) {
        if ((bit & (1 << i)) > 0) grades.push(i + 1);
    }
    return grades;
};

export const getTermLabel = (bit: number): string => {
    const termVal = (bit >> 8) & 3;
    if (termVal === 0) return '前期';
    if (termVal === 1) return '後期';
    if (termVal === 2) return '通年';
    return '不明';
};

export const getQuarterLabel = (bit: number): string => {
    const qVal = (bit >> 6) & 3;
    if (qVal === 0) return '奇数Q';
    if (qVal === 1) return '偶数Q';
    if (qVal === 2) return 'またぎ';
    if (qVal === 3) return '集中等';
    return '不明';
};

export const isRetakeCourse = (bit: number): boolean => {
    return (bit & (1 << 10)) > 0;
};

export const filterByBit = (
    courses: CourseData[],
    filters: { selectedGrade: number, term: 'first' | 'second' | 'full', isReRegistrationOnly: boolean }
): CourseData[] => {
    const { selectedGrade, term } = filters;

    // 判定用のターゲットビットを作成
    let targetTermBit = 0;
    if (term === 'second') targetTermBit = 1;
    else if (term === 'full') targetTermBit = 2;

    return courses.filter(course => {
        // --- 判定ロジック ---
        const checkMatch = (bit: number | undefined) => {
            if (bit === undefined) return false;
            const gradeMatch = (bit & (1 << (selectedGrade - 1))) > 0;
            const courseTerm = (bit >> 8) & 3;
            const termMatch = (courseTerm === targetTermBit) || (courseTerm === 2);
            return gradeMatch && termMatch;
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
export const getPeriodLabel = (bit: number): string => {
    const term = (bit >> 8) & 0b11;    // Bit 9-8 (00:前期, 01:後期, 10:両方)
    const quarter = (bit >> 6) & 0b11; // Bit 7-6 (00:奇数, 01:偶数, 10:通期, 11:集中)

    if (quarter === 0b11) return '集中';

    if (term === 0b00) { // 前期
        if (quarter === 0b00) return '1Q';
        if (quarter === 0b01) return '2Q';
        if (quarter === 0b10) return '前期';
    } else if (term === 0b01) { // 後期
        if (quarter === 0b00) return '3Q';
        if (quarter === 0b01) return '4Q';
        if (quarter === 0b10) return '後期';
    } else if (term === 0b10 && quarter === 0b10) {
        return '通年';
    }

    return '不明'; // 万が一のエラー用
};