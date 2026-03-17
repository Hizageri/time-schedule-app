// src/timetableGenerator.ts
import type { AppState, CourseData } from './types';
import { checkScheduleConflict } from './utils';

export type PatternType = 'balance' | 'full-day-off' | 'zero-first-period' | 'night-shift' | 'zero-gaps';

export interface GeneratedTimetable {
    patternId: PatternType;
    classes: AppState['committedClasses'];
    score: number;
}

// Simple CSP Backtracking Solver
export const generateTimetables = (
    settings: AppState['timetableSettings'],
    selectedCourses: CourseData[]
): GeneratedTimetable[] => {
    const result: GeneratedTimetable[] = [];

    // Helper to calculate scores based on different constraints
    const scoreTimetable = (classes: AppState['committedClasses'], patternId: PatternType) => {
        let score = 0;
        const days = ['月', '火', '水', '木', '金', '土'].slice(0, settings.workingDays);
        const periods = Array.from({ length: settings.maxPeriods }, (_, i) => i + 1);

        const scheduleSet = new Set<string>();
        classes.forEach(c => c.schedule.forEach(s => scheduleSet.add(s)));

        if (patternId === 'balance') score = 100; // Just baseline

        if (patternId === 'full-day-off') {
            let fullDaysOff = 0;
            days.forEach(d => {
                let hasClass = false;
                periods.forEach(p => { if (scheduleSet.has(`${d}-${p}`)) hasClass = true; });
                if (!hasClass) fullDaysOff++;
            });
            score = fullDaysOff * 100;
        }

        if (patternId === 'zero-first-period') {
            let firstPeriods = 0;
            days.forEach(d => { if (scheduleSet.has(`${d}-1`)) firstPeriods++; });
            score = 100 - (firstPeriods * 20);
        }

        if (patternId === 'night-shift') {
            let lateClasses = 0;
            scheduleSet.forEach(s => {
                const period = parseInt(s.split('-')[1]);
                if (period >= 4) lateClasses++;
            });
            score = 100 - (lateClasses * 10);
        }

        if (patternId === 'zero-gaps') {
            let gaps = 0;
            days.forEach(d => {
                let firstClass = -1;
                let lastClass = -1;
                periods.forEach(p => {
                    if (scheduleSet.has(`${d}-${p}`)) {
                        if (firstClass === -1) firstClass = p;
                        lastClass = p;
                    }
                });
                if (firstClass !== -1 && lastClass !== -1) {
                    let expectedGaps = (lastClass - firstClass + 1);
                    let actualClasses = 0;
                    for (let p = firstClass; p <= lastClass; p++) {
                        if (scheduleSet.has(`${d}-${p}`)) actualClasses++;
                    }
                    gaps += (expectedGaps - actualClasses);
                }
            });
            score = 100 - (gaps * 20);
        }
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

    const patterns: PatternType[] = ['balance', 'full-day-off', 'zero-first-period', 'night-shift', 'zero-gaps'];
    const finalTimetables: GeneratedTimetable[] = [];

    patterns.forEach(p => {
        let best = result[0];
        let bestScore = -9999;
        result.forEach(r => {
            const s = scoreTimetable(r.classes, p);
            if (s > bestScore) {
                bestScore = s;
                best = r;
            }
        });
        // Deep clone the best classes
        finalTimetables.push({
            patternId: p,
            classes: JSON.parse(JSON.stringify(best.classes)),
            score: bestScore
        });
    });

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

    let tBit = 0;
    if (term === 'second') tBit = 1;
    else if (term === 'full') tBit = 2;

    return courses.filter(course => {
        const bit = course.target_bit;

        // Grade Match (AND)
        const gradeMatch = (bit & (1 << (selectedGrade - 1))) > 0;

        // Term Match (course term matches user term, or course is full-year 2)
        const courseTerm = (bit >> 8) & 3;
        const termMatch = (courseTerm === tBit) || (courseTerm === 2);

        return gradeMatch && termMatch;
    }).sort((a, b) => {
        const aRetake = isRetakeCourse(a.target_bit) ? 1 : 0;
        const bRetake = isRetakeCourse(b.target_bit) ? 1 : 0;

        // Prioritize retake
        if (aRetake !== bRetake) {
            return bRetake - aRetake;
        }

        // Fallback proximity sort
        const minGradeA = Math.min(...getTargetGrades(a.target_bit));
        const minGradeB = Math.min(...getTargetGrades(b.target_bit));
        const distA = Math.abs(minGradeA - selectedGrade);
        const distB = Math.abs(minGradeB - selectedGrade);
        return distA - distB;
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