// target_bit（科目・クラスの対象条件のビット）の読み取りとラベル
import type { AppState } from '../types';

export type QuarterType = 'odd' | 'even' | 'across' | 'intensive';
export type Term = AppState['timetableConditions']['term'];

/** 学期のビット（bit 8-9）。0=前期 1=後期 2=通年 */
export const getTermBit = (bit: number): number => (bit >> 8) & 3;

/** 今の学期の値（'first'→0、'second'→1、'full'→2） */
export const toSessionTermBit = (term: Term): number => (term === 'second' ? 1 : term === 'full' ? 2 : 0);

/** 通年（2）なら常に、それ以外は今の学期と一致すれば true */
export const isInSessionTerm = (bit: number, term: Term): boolean => {
    const courseTerm = getTermBit(bit);
    return courseTerm === 2 || courseTerm === toSessionTermBit(term);
};

/** クォーター（bit 6-7）。0=odd（奇数Q） 1=even（偶数Q） 2=across（またぎ） 3=intensive（集中講義など） */
export const getQuarterType = (bit: number): QuarterType => {
    const qVal = (bit >> 6) & 3;
    if (qVal === 0) return 'odd';
    if (qVal === 1) return 'even';
    if (qVal === 2) return 'across';
    return 'intensive';
};

export const getTargetGrades = (bit: number): number[] => {
    const grades: number[] = [];
    for (let i = 0; i < 6; i++) {
        if ((bit & (1 << i)) > 0) grades.push(i + 1);
    }
    return grades;
};

export const getTermLabel = (bit: number): string => {
    const termVal = getTermBit(bit);
    if (termVal === 0) return '前期';
    if (termVal === 1) return '後期';
    if (termVal === 2) return '通年';
    return '不明';
};

export const getQuarterLabel = (bit: number): string => {
    const quarter = getQuarterType(bit);
    if (quarter === 'odd') return '奇数Q';
    if (quarter === 'even') return '偶数Q';
    if (quarter === 'across') return 'またぎ';
    return '集中等';
};

export const isRetakeCourse = (bit: number): boolean => {
    return (bit & (1 << 10)) > 0;
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
