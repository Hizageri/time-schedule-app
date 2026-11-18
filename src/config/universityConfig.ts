// 大学ごとの設定の形と、設定から選択肢を作る関数。
// 大学ごとの値は src/config/universities/ に1大学1ファイルで書き、今の大学は src/config/currentUniversity.ts で決める
import type { GradingScale } from '../types';

/** 学期の決まり */
export interface TermDef {
    id: 'first' | 'second';
    /** 例：'前期' */
    label: string;
    /**
     * 学期の中のクォーター。会津大学は2つ（前期は Q1・Q2）。ない大学は []。
     * label は時間割の切りかえに、courseLabel は科目カードの開講時期に出す名前
     */
    quarters: { label: string; courseLabel: string }[];
}

/** ベースクラスの選択肢（学年ごと） */
export interface BaseClassGroup {
    /** この選択肢を出す学年 */
    grades: number[];
    /** 例：['C1', 'C2', …] */
    options: string[];
    /** 条件の画面の説明文 */
    description: string;
}

export interface UniversityConfig {
    /** 例：'u-aizu'（university-data-model で利用者のデータから引く） */
    id: string;
    name: string;
    /** 例：'4学期制' */
    termSystemLabel: string;
    /** 前期・後期 */
    terms: TermDef[];
    /** 通年の科目があるか */
    hasFullYearCourses: boolean;
    /** 授業のある曜日の最大 */
    days: string[];
    /** その大学の最後の時限 */
    lastPeriod: number;
    /** 最大時限として選べるいちばん小さい値 */
    minSelectablePeriod: number;
    gradeRange: { min: number; max: number };
    baseClasses: BaseClassGroup[];
    /** 成績の段階。ポイント 0 は不合格 */
    gradingScale: GradingScale[];
    /** 保存データに残っている、今の段階にない成績の読みかえ（会津大学：D → F） */
    gradeAliases: Record<string, string>;
}

/** 最大時限の選択肢（minSelectablePeriod 〜 lastPeriod） */
export const getSelectablePeriods = (config: UniversityConfig): number[] =>
    Array.from(
        { length: config.lastPeriod - config.minSelectablePeriod + 1 },
        (_, i) => config.minSelectablePeriod + i
    );

/** 学年の選択肢（gradeRange.min 〜 gradeRange.max） */
export const getSelectableGrades = (config: UniversityConfig): number[] =>
    Array.from(
        { length: config.gradeRange.max - config.gradeRange.min + 1 },
        (_, i) => config.gradeRange.min + i
    );

/** その学年のベースクラスの選択肢。合うグループがなければ最後のグループ */
export const getBaseClassGroup = (config: UniversityConfig, grade: number): BaseClassGroup =>
    config.baseClasses.find(g => g.grades.includes(grade)) ?? config.baseClasses[config.baseClasses.length - 1];

/** 今の学期の決まり（学期 'full' は後期の決まりを使う。'full' を選ぶ画面はない） */
export const getTermDef = (config: UniversityConfig, term: 'first' | 'second' | 'full'): TermDef =>
    config.terms.find(t => t.id === (term === 'first' ? 'first' : 'second')) ?? config.terms[0];

/** 学期の名前（通年は '通年'） */
export const getTermLabel = (config: UniversityConfig, term: 'first' | 'second' | 'full'): string =>
    term === 'full' ? '通年' : getTermDef(config, term).label;
