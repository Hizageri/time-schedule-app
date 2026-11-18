// 共通の形の科目の条件（CourseConditions）で判定する関数。大学ごとの元の形（会津大学の target_bit）は読まない
import type { ClassInfo, CourseConditions, CourseData } from '../types';

export type Term = 'first' | 'second' | 'full';

/** 今の学期に開講しているか（通年の科目は、どの学期でも対象） */
export const matchesTerm = (conditions: CourseConditions, term: Term): boolean =>
    conditions.term === 'full' || conditions.term === term;

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
