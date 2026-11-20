// 共通の形の科目の条件（CourseConditions）で判定する関数。大学ごとの元の形（会津大学の target_bit）は読まない
import type { ClassInfo, CourseConditions, CourseData } from '../types';
import type { UniversityConfig } from '../config/universityConfig';
import { getTermDef } from '../config/universityConfig';

export type Term = 'first' | 'second' | 'full';

/** 今の学期に開講しているか（通年の科目は、どの学期でも対象。前期・後期のどちらかで受ける科目は、前期でも後期でも対象） */
export const matchesTerm = (conditions: CourseConditions, term: Term): boolean => {
    if (conditions.term === 'either') return term === 'first' || term === 'second';
    return conditions.term === 'full' || conditions.term === term;
};

/** その学年が対象か */
export const includesGrade = (conditions: CourseConditions, grade: number): boolean =>
    conditions.grades.includes(grade);

/** 再履修向けか */
export const isRetake = (conditions: CourseConditions): boolean => conditions.isRetake;

/** 集中講義などか */
export const isIntensive = (conditions: CourseConditions): boolean => conditions.slot.type === 'intensive';

/** そのクォーター（0 始まり）の時間割に出るか。学期を通しての授業は常に出る。集中講義などは出ない */
export const isInQuarter = (conditions: CourseConditions, quarterIndex: number): boolean => {
    if (conditions.slot.type === 'whole') return true;
    if (conditions.slot.type === 'intensive') return false;
    return conditions.slot.index === quarterIndex;
};

/** 科目の代表の条件（科目の条件 → 最初のクラスの条件）。並べ替えと科目カードの表示に使う */
export const getCourseConditions = (course: CourseData): CourseConditions | undefined =>
    course.conditions ?? course.classes[0]?.conditions;

/** クラスの条件（クラスの条件 → 科目の条件） */
export const getClassConditions = (course: CourseData, cls: ClassInfo): CourseConditions | undefined =>
    cls.conditions ?? course.conditions;

/** 科目カードの開講時期の名前（会津大学：1Q〜4Q・前期・後期・通年・集中・前期・後期のどちらか（例：前期・後期、1Q・3Q）） */
export const getPeriodLabel = (config: UniversityConfig, conditions: CourseConditions | undefined): string => {
    if (!conditions) return '不明';
    if (conditions.slot.type === 'intensive') return '集中';
    if (conditions.term === 'full') return conditions.slot.type === 'whole' ? '通年' : '不明';
    if (conditions.term === 'either') {
        // 前期・後期のそれぞれの名前をつなぐ（クォーターが決まっていれば、両方の学期のそのクォーターの名前）
        const slot = conditions.slot;
        const names = config.terms.map(t => slot.type === 'whole' ? t.label : t.quarters[slot.index]?.courseLabel);
        return names.every(n => n !== undefined) ? names.join('・') : '不明';
    }
    const termDef = getTermDef(config, conditions.term);
    if (conditions.slot.type === 'whole') return termDef.label;
    return termDef.quarters[conditions.slot.index]?.courseLabel ?? '不明';
};

/** 対象の学年の名前（大学の学年の範囲をすべて含むときは '全学年'） */
export const getGradesLabel = (config: UniversityConfig, grades: number[]): string =>
    grades.length === config.gradeRange.max - config.gradeRange.min + 1 ? '全学年' : `${grades.join(',')}年`;
