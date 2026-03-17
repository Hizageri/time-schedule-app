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
