export type TimeSlot =
    | "月-1" | "月-2" | "月-3" | "月-4" | "月-5" | "月-6" | "月-7" | "月-8" | "月-9" | "月-10"
    | "火-1" | "火-2" | "火-3" | "火-4" | "火-5" | "火-6" | "火-7" | "火-8" | "火-9" | "火-10"
    | "水-1" | "水-2" | "水-3" | "水-4" | "水-5" | "水-6" | "水-7" | "水-8" | "水-9" | "水-10"
    | "木-1" | "木-2" | "木-3" | "木-4" | "木-5" | "木-6" | "木-7" | "木-8" | "木-9" | "木-10"
    | "金-1" | "金-2" | "金-3" | "金-4" | "金-5" | "金-6" | "金-7" | "金-8" | "金-9" | "金-10"
    | string; // 集中講義などの特殊な文字列も許容

export interface ClassInfo {
    class_id: string;
    schedule: TimeSlot[];
    // 追加: クラスごとにターゲットビットを持てるようにする（?をつけて任意にする）
    target_bit?: number;
}

export interface CourseData {
    id_name: string;
    // 修正: 外側にビットがない場合もあるので、? をつけて任意（Optional）にする
    target_bit?: number;
    credits: number;
    outline: string;
    grading?: { exam: number; report: number; others: number };
    classes: ClassInfo[];
}

// 11-bit filtering logic calculation
export const calculateStudentBit = (
    targetGrade: number,
    term: 'first' | 'second' | 'full',
    isRetake: boolean
): number => {
    let bit = 0;
    // Bit 5-0: Target grade
    if (targetGrade >= 1 && targetGrade <= 6) {
        bit |= (1 << (targetGrade - 1));
    }

    // Bit 7-6: Quarter (00: odd, 01: even, 10: across, 11: intensive)
    // For V2, term registration implies you can see all quarter classes.
    bit |= (3 << 6); // 11 in binary to match any quarter bit mask (since target checks AND > 0)

    // Bit 9-8: Term (00: 1st, 01: 2nd, 10: full)
    let tBit = 0;
    if (term === 'second') tBit = 1;
    else if (term === 'full') tBit = 2;
    bit |= (tBit << 8);

    // Bit 10: Retake (1: retake, 0: normal)
    if (isRetake) {
        bit |= (1 << 10);
    }

    return bit;
};

export const canTakeClass = (targetBit: number, studentBit: number): boolean => {
    return (targetBit & studentBit) > 0;
};

export interface GradingScale {
    label: string;
    point: number;
}

export interface AppState {
    currentScreen: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
    userProfile: {
        nickname: string;
        university: string;
        dreamJob: string;
        gradingScale: GradingScale[];
        termSystem: string;
    };
    timetableSettings: {
        workingDays: number; // 5 (Mon-Fri) or 6 (Mon-Sat)
        maxPeriods: number; // e.g. 5, 6, 7
    };
    timetableConditions: {
        targetGrade: number;
        term: 'first' | 'second' | 'full';
        hasRetake: boolean;
        retakeClasses: string[]; // IDs
        baseClass: string;
    };
    selectedCourses: CourseData[]; // holding selected courses before commit
    committedClasses: {
        courseId: string;
        targetBit: number | undefined; // to identify quarter later
        classId: string;
        schedule: TimeSlot[];
    }[];
    grades: Record<string, { grade: string, classDifficulty: number, testDifficulty: number }>;
    pinnedClasses: Record<string, string>; // courseId -> classId
    classroomNames: Record<string, string>; // slotKey (e.g. "月-1") -> classroom name
}

export const defaultState: AppState = {
    currentScreen: 1,
    userProfile: {
        nickname: '',
        university: '会津大学',
        dreamJob: '',
        gradingScale: [
            { label: 'A', point: 4 },
            { label: 'B', point: 3 },
            { label: 'C', point: 2 },
            { label: 'D', point: 0 },
            { label: 'F', point: 0 }
        ],
        termSystem: '4学期制'
    },
    timetableSettings: {
        workingDays: 5,
        maxPeriods: 5
    },
    timetableConditions: {
        targetGrade: 1,
        term: 'first',
        hasRetake: false,
        retakeClasses: [],
        baseClass: 'C1'
    },
    selectedCourses: [],
    committedClasses: [],
    grades: {},
    pinnedClasses: {},
    classroomNames: {}
};
