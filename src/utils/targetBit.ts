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
