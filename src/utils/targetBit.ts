// target_bit（科目・クラスの対象条件のビット）の読み取りとラベル

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
