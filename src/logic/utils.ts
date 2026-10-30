import type { TimeSlot } from "../types";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

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

/**
 * 会津大の科目コードに基づいた動的カラー決定ロジック
 */
export const getSubjectColor = (courseId: string): string => {
    const prefix = courseId.substring(0, 2).toUpperCase();

    const colorMap: Record<string, string> = {
        // --- 専門教育・基礎 ---
        'MA': 'bg-blue-100 text-blue-700 border-blue-200',      // 数学：理知的で冷静なブルー
        'NS': 'bg-cyan-100 text-cyan-700 border-cyan-200',      // 自然科学：科学的なシアン
        'LI': 'bg-indigo-100 text-indigo-700 border-indigo-200', // リテラシー：知的なインディゴ
        'PL': 'bg-emerald-100 text-emerald-700 border-emerald-200', // プログラミング：成長のグリーン
        'FU': 'bg-teal-100 text-teal-700 border-teal-200',      // 基礎：安定のティール

        // --- 専門科目（応用） ---
        'SY': 'bg-rose-100 text-rose-700 border-rose-200',      // システム：ハードウェアの情熱
        'CN': 'bg-orange-100 text-orange-700 border-orange-200', // ネットワーク：繋がるオレンジ
        'IT': 'bg-violet-100 text-violet-700 border-violet-200', // アプリケーション：創造のバイオレット
        'SE': 'bg-purple-100 text-purple-700 border-purple-200', // ソフトウェア：構築のパープル

        // --- 英語・外国語 ---
        'EN': 'bg-sky-100 text-sky-700 border-sky-200',         // 英語：空のように広がるスカイ
        'EL': 'bg-sky-50 text-sky-600 border-sky-100',          // 選択英語：少し薄めのスカイ
        'JP': 'bg-red-100 text-red-700 border-red-200',         // 日本語：日の丸のレッド

        // --- 人文社会・教職・その他 ---
        'HS': 'bg-amber-100 text-amber-700 border-amber-200',   // 人文社会：温かみのあるアンバー
        'SS': 'bg-lime-100 text-lime-700 border-lime-200',      // スポーツ：芝生のライム
        'TE': 'bg-yellow-100 text-yellow-700 border-yellow-200', // 教職：未来を照らすイエロー
        'IE': 'bg-pink-100 text-pink-700 border-pink-200',      // 実践：活動的なピンク
        'OT': 'bg-slate-100 text-slate-700 border-slate-200',   // その他：落ち着いたスレート
    };

    // 該当なし、または課外プロジェクト(OT03等)のデフォルト
    return colorMap[prefix] || 'bg-background-200 text-foreground-600 border-border';
};

// ─────────────────────────────────────────────
// 入学年月・卒業予定年月（プロフィール。保存の値は "YYYY-MM" か ''）
// ─────────────────────────────────────────────

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
