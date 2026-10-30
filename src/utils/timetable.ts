import type { AppState, CourseData, TimeSlot } from '../types';

/**
 * 科目ごとのクラスを決める。優先順位：
 * 1. 有効なピン（その科目の開講クラスにあるとき）
 * 2. パターンの割り当て（その科目の開講クラスにあるとき）
 * 3. 最初のクラス（なければ空文字）
 */
export const resolveClassAssignments = (
    courses: CourseData[],
    patternAssignments: { courseId: string; classId: string }[],
    pinnedClasses: AppState['pinnedClasses']
): Record<string, string> => {
    const fromPattern: Record<string, string> = {};
    patternAssignments.forEach(a => {
        fromPattern[a.courseId] = a.classId;
    });

    const result: Record<string, string> = {};
    courses.forEach(course => {
        const isOffered = (classId: string | undefined) =>
            classId !== undefined && course.classes.some(c => c.class_id === classId);
        const pinned = pinnedClasses[course.id_name];
        const assigned = fromPattern[course.id_name];
        if (isOffered(pinned)) {
            result[course.id_name] = pinned;
        } else if (isOffered(assigned)) {
            result[course.id_name] = assigned;
        } else {
            result[course.id_name] = course.classes[0]?.class_id || '';
        }
    });
    return result;
};

/** 「曜日-時限」の形のコマのうち、いちばん遅い時限。なければ 0（"TBD" や日付の形のコマは無視する） */
export const getLatestPeriod = (schedules: TimeSlot[][]): number => {
    let latest = 0;
    schedules.forEach(schedule => {
        schedule.forEach(slot => {
            const match = /^[月火水木金土日]-(\d+)$/.exec(slot);
            if (match) latest = Math.max(latest, Number(match[1]));
        });
    });
    return latest;
};

export const checkScheduleConflict = (
    // 既存のクラス情報（スケジュールとビットのペア）の配列を受け取る
    existingClasses: { schedule: TimeSlot[], targetBit: number | undefined }[],
    newSchedule: TimeSlot[],
    newBit: number | undefined
): boolean => {
    for (const existing of existingClasses) {
        // 1. まず時間のコマが被っているかチェック
        const hasCommonSlot = (existing.schedule ?? []).some(slot =>
            slot !== "TBD" && slot.includes("-") && newSchedule.includes(slot)
        );

        if (hasCommonSlot) {
            // 2. コマが被っている場合、クォーター(Bit 6-7)をチェック
            const qExisting = (existing.targetBit ?? 0 >> 6) & 3;
            const qNew = (newBit ?? 0 >> 6) & 3;

            // 片方が「またぎ(2)」や「集中(3)」なら、コマが被った時点で衝突
            if (qExisting >= 2 || qNew >= 2) return true;

            // 0:奇数Q, 1:偶数Q なので、ここが一致する場合だけが「本当の衝突」
            if (qExisting === qNew) return true;
        }
    }

    return false;
};

export const parseTimeSlot = (slot: string) => {
    const [day, period] = slot.split('-');
    return { day, period: parseInt(period, 10) };
};

export const DAYS = ["月", "火", "水", "木", "金"];

export const PERIODS = [1, 2, 3, 4, 5];
