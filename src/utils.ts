import type { TimeSlot } from "./types";

export const checkScheduleConflict = (
    // 既存のクラス情報（スケジュールとビットのペア）の配列を受け取る
    existingClasses: { schedule: TimeSlot[], targetBit: number | undefined }[],
    newSchedule: TimeSlot[],
    newBit: number | undefined
): boolean => {
    for (const existing of existingClasses) {
        // 1. まず時間のコマが被っているかチェック
        const hasCommonSlot = existing.schedule.some(slot =>
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
