// 今の大学（会津大学）の、大学ごとに変わる値を1か所に置く。
// 第2段階の university-data-model で、大学ごとの設定に置きかえる

export interface UniversityConfig {
    name: string;
    /** その大学の最後の時限 */
    lastPeriod: number;
    /** 最大時限として選べるいちばん小さい値 */
    minSelectablePeriod: number;
}

export const CURRENT_UNIVERSITY: UniversityConfig = {
    name: '会津大学',
    lastPeriod: 11,
    minSelectablePeriod: 5,
};

/** 最大時限の選択肢（minSelectablePeriod 〜 lastPeriod） */
export const getSelectablePeriods = (config: UniversityConfig = CURRENT_UNIVERSITY): number[] =>
    Array.from(
        { length: config.lastPeriod - config.minSelectablePeriod + 1 },
        (_, i) => config.minSelectablePeriod + i
    );
