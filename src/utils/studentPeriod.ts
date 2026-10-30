// 入学年月・卒業予定年月（プロフィール。保存の値は "YYYY-MM" か ''）

/** 選べる年の幅（今年の前後 N 年） */
export const STUDENT_PERIOD_YEAR_RANGE = 4;

/** 月の選択肢 */
export const MONTH_OPTIONS: number[] = Array.from({ length: 12 }, (_, i) => i + 1);

const YEAR_MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

const PARTIAL_YEAR_MONTH_MESSAGE = '年と月の両方を選ぶか、両方を空にしてください';

const GRADUATION_ORDER_MESSAGE = '卒業予定は入学より後の年月にしてください';

/** 画面の下書き。'' は未選択。year は "2026"、month は "4" のような文字列 */
export interface YearMonthDraft {
    year: string;
    month: string;
}

/** 保存の値（"YYYY-MM" か ''）を下書きにする。形が違う値は空の下書きにする */
export const toYearMonthDraft = (value: string): YearMonthDraft => {
    const match = YEAR_MONTH_PATTERN.exec(value);
    return match ? { year: match[1], month: String(Number(match[2])) } : { year: '', month: '' };
};

/** 選べる年（今年 - 4 〜 今年 + 4）。keepYear（保存済みの年）が範囲の外なら、それも入れて昇順で返す */
export const getYearOptions = (currentYear: number, keepYear?: string): number[] => {
    const years = Array.from(
        { length: STUDENT_PERIOD_YEAR_RANGE * 2 + 1 },
        (_, i) => currentYear - STUDENT_PERIOD_YEAR_RANGE + i
    );
    const kept = Number(keepYear);
    if (keepYear && Number.isInteger(kept) && !years.includes(kept)) {
        years.push(kept);
        years.sort((a, b) => a - b);
    }
    return years;
};

/** 保存の値を表示用にする。"2026-04" → "2026年4月"、'' や形の違う値 → "未設定" */
export const formatYearMonth = (value: string): string => {
    const draft = toYearMonthDraft(value);
    return draft.year ? `${draft.year}年${draft.month}月` : '未設定';
};

export type StudentPeriodResult =
    | { ok: true; enrollmentYearMonth: string; expectedGraduationYearMonth: string }
    | { ok: false; enrollmentError?: string; graduationError?: string };

/** 下書きを保存の値にする。両方空なら ''、両方あれば "YYYY-MM"、片方だけなら null */
const draftToValue = (draft: YearMonthDraft): string | null => {
    if (draft.year === '' && draft.month === '') return '';
    if (draft.year === '' || draft.month === '') return null;
    return `${draft.year}-${draft.month.padStart(2, '0')}`;
};

/** 2つの下書きを確かめて、保存の値にする（片方だけの欄、卒業予定が入学より後でない組み合わせは通さない） */
export const validateStudentPeriod = (
    enrollment: YearMonthDraft,
    graduation: YearMonthDraft
): StudentPeriodResult => {
    const enrollmentYearMonth = draftToValue(enrollment);
    const expectedGraduationYearMonth = draftToValue(graduation);
    if (enrollmentYearMonth === null || expectedGraduationYearMonth === null) {
        return {
            ok: false,
            enrollmentError: enrollmentYearMonth === null ? PARTIAL_YEAR_MONTH_MESSAGE : undefined,
            graduationError: expectedGraduationYearMonth === null ? PARTIAL_YEAR_MONTH_MESSAGE : undefined,
        };
    }
    // 片方だけ入っているときは前後を比べない。"YYYY-MM" は文字列の比較で前後が決まる
    if (enrollmentYearMonth !== '' && expectedGraduationYearMonth !== '' && expectedGraduationYearMonth <= enrollmentYearMonth) {
        return { ok: false, graduationError: GRADUATION_ORDER_MESSAGE };
    }
    return { ok: true, enrollmentYearMonth, expectedGraduationYearMonth };
};
