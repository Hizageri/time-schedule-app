import type { TimeSlot } from "./types";

export const checkScheduleConflict = (
    existingSchedules: TimeSlot[][],
    newSchedule: TimeSlot[]
): boolean => {
    const existingSet = new Set<string>();
    existingSchedules.forEach(scheduleList => {
        scheduleList.forEach(slot => {
            // Ignore flexible/TBD schedules
            if (slot !== "TBD" && slot.includes("-")) {
                existingSet.add(slot);
            }
        });
    });

    for (const slot of newSchedule) {
        if (slot !== "TBD" && slot.includes("-") && existingSet.has(slot)) {
            return true; // Conflict detected
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
