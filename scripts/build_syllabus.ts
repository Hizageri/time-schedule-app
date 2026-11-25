// シラバスの変換：会津大学の syllabus.json の target_bit から、共通の形の科目の条件（CourseConditions）を作り、
// 確かめてから src/data/course_conditions.json（生成物）に書き出す。元の syllabus.json は書きかえない。
//   npm run build:syllabus
//   npm run build:syllabus -- --input <シラバスの写し> --output <書き出す先>   （試すとき）
// 1つでもおかしければ、ファイルを書かずに止まり、科目の名前と理由を出す（推測で埋めない）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CourseConditions, CourseConditionsFile } from '../src/types/index.ts';
import { aizuUniversity } from '../src/config/universities/aizu.ts';
import {
    getQuarterType,
    getTargetGrades,
    isInSessionTerm,
    isRetakeCourse,
    toCourseConditions,
} from '../src/utils/targetBit.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argValue = (name: string): string | undefined => {
    const i = process.argv.indexOf(name);
    return i >= 0 ? process.argv[i + 1] : undefined;
};
const inputPath = path.resolve(argValue('--input') ?? path.join(root, 'src/data/syllabus.json'));
const outputPath = path.resolve(argValue('--output') ?? path.join(root, 'src/data/course_conditions.json'));

interface RawClass {
    class_id?: unknown;
    target_bit?: unknown;
    intensive_quarter?: unknown;
}
interface RawCourse {
    id_name?: unknown;
    target_bit?: unknown;
    intensive_quarter?: unknown;
    classes?: unknown;
}

/**
 * 集中講義の学期（intensive_quarter。シラバスと同じ 1〜4）を、共通の形のクォーターの番号にする（1・3 → 0、2・4 → 1）。
 * 集中講義でない・1〜4 でない・学期と合わない（前期なのに 3・4 など）・通年か前期・後期のどちらかの科目にある、なら止まる
 */
const applyIntensiveQuarter = (where: string, conditions: CourseConditions, value: unknown): CourseConditions => {
    if (value === undefined) return conditions;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 4) {
        problem(where, `intensive_quarter が 1〜4 ではない（${JSON.stringify(value)}）`);
        return conditions;
    }
    if (conditions.slot.type !== 'intensive') {
        problem(where, `集中講義でないのに intensive_quarter がある（${value}）`);
        return conditions;
    }
    if (conditions.term === 'full' || conditions.term === 'either') {
        problem(where, `通年か前期・後期のどちらかの科目に intensive_quarter がある（${value}）`);
        return conditions;
    }
    const term = value <= 2 ? 'first' : 'second';
    if (term !== conditions.term) {
        problem(where, `intensive_quarter（${value}）が target_bit の学期（${conditions.term === 'first' ? '前期' : '後期'}）と合わない`);
        return conditions;
    }
    const index = (value - 1) % 2;
    const termDef = config.terms.find(t => t.id === term);
    if (!termDef || index >= termDef.quarters.length) {
        problem(where, `intensive_quarter（${value}）のクォーターが設定にない`);
        return conditions;
    }
    return { ...conditions, slot: { type: 'intensive', index } };
};

const problems: string[] = [];
const problem = (where: string, reason: string) => problems.push(`${where}：${reason}`);

const config = aizuUniversity;
const TERMS = ['first', 'second', 'full'] as const;

/** ビットとして読める値か（0 以上 2^11 未満の整数） */
const isReadableBit = (value: unknown): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < 1 << 11;

/** 1つのビットを共通の形にし、targetBit.ts の読み取りと照らし合わせ、値の範囲を確かめる */
const convert = (where: string, bit: unknown): CourseConditions | undefined => {
    if (!isReadableBit(bit)) {
        problem(where, `target_bit が読めない値（${JSON.stringify(bit)}）`);
        return undefined;
    }
    const conditions = toCourseConditions(bit);

    // 照らし合わせ：学年
    for (let grade = 1; grade <= 6; grade++) {
        const expected = getTargetGrades(bit).includes(grade);
        if (conditions.grades.includes(grade) !== expected) problem(where, `${grade}年の対象が target_bit の読み取りと違う`);
    }
    // 照らし合わせ：学期（今の学期が前期・後期・通年のそれぞれで、対象になるか）
    for (const term of TERMS) {
        const expected = isInSessionTerm(bit, term);
        const actual = conditions.term === 'either'
            ? term === 'first' || term === 'second'
            : conditions.term === 'full' || conditions.term === term;
        if (actual !== expected) problem(where, `学期（${term}）の判定が target_bit の読み取りと違う`);
    }
    // 照らし合わせ：クォーター
    const quarter = getQuarterType(bit);
    const expectedSlot = quarter === 'odd' ? 'quarter:0' : quarter === 'even' ? 'quarter:1' : quarter === 'across' ? 'whole' : 'intensive';
    const actualSlot = conditions.slot.type === 'quarter' ? `quarter:${conditions.slot.index}` : conditions.slot.type;
    if (actualSlot !== expectedSlot) problem(where, `クォーター（${actualSlot}）が target_bit の読み取り（${quarter}）と違う`);
    // 照らし合わせ：再履修
    if (conditions.isRetake !== isRetakeCourse(bit)) problem(where, '再履修が target_bit の読み取りと違う');

    // 値の範囲：学年が設定の範囲の中で、1つ以上ある
    if (conditions.grades.length === 0) problem(where, `対象の学年がない（target_bit ${bit}）`);
    for (const grade of conditions.grades) {
        if (grade < config.gradeRange.min || grade > config.gradeRange.max) problem(where, `学年 ${grade} が設定の範囲の外`);
    }
    // 値の範囲：学期とクォーターが設定にある値
    if (conditions.term === 'full') {
        if (!config.hasFullYearCourses) problem(where, '通年の科目がない大学なのに通年になっている');
        if (conditions.slot.type === 'quarter') problem(where, '通年の科目なのにクォーターが1つに決まっている');
    } else if (conditions.term === 'either') {
        // 前期・後期のどちらか：両方の学期が設定にあり、クォーターの番号が両方の学期の中にある
        for (const id of ['first', 'second'] as const) {
            const termDef = config.terms.find(t => t.id === id);
            if (!termDef) problem(where, `前期・後期のどちらかの科目なのに、学期 ${id} が設定にない`);
            else if (conditions.slot.type === 'quarter' && conditions.slot.index >= termDef.quarters.length) {
                problem(where, `クォーターの番号 ${conditions.slot.index} が学期 ${id} の設定（${termDef.quarters.length}つ）の外`);
            }
        }
    } else {
        const termDef = config.terms.find(t => t.id === conditions.term);
        if (!termDef) problem(where, `学期 ${conditions.term} が設定にない`);
        else if (conditions.slot.type === 'quarter' && conditions.slot.index >= termDef.quarters.length) {
            problem(where, `クォーターの番号 ${conditions.slot.index} が設定（${termDef.quarters.length}つ）の外`);
        }
    }
    return conditions;
};

const raw: unknown = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
if (!Array.isArray(raw)) {
    console.error(`止めました：${inputPath} が科目の配列ではありません`);
    process.exit(1);
}

const output: CourseConditionsFile = {};
let courseCount = 0;
let classCount = 0;
let conditionCount = 0;

(raw as RawCourse[]).forEach((course, index) => {
    const name = typeof course.id_name === 'string' && course.id_name !== '' ? course.id_name : `（${index + 1}番目の科目、id_name がない）`;
    if (typeof course.id_name !== 'string' || course.id_name === '') {
        problem(name, 'id_name がない');
        return;
    }
    if (output[course.id_name]) {
        problem(name, 'id_name が重なっている');
        return;
    }
    if (!Array.isArray(course.classes) || course.classes.length === 0) {
        problem(name, 'クラスがない');
        return;
    }
    courseCount++;
    const entry: CourseConditionsFile[string] = {};
    if (course.target_bit !== undefined) {
        const conditions = convert(name, course.target_bit);
        if (conditions) {
            entry.course = applyIntensiveQuarter(name, conditions, course.intensive_quarter);
            conditionCount++;
        }
    } else if (course.intensive_quarter !== undefined) {
        problem(name, '科目に target_bit がないのに intensive_quarter がある（クラスに書く）');
    }
    const classes: Record<string, CourseConditions> = {};
    const seenClassIds = new Set<string>();
    (course.classes as RawClass[]).forEach((cls, classIndex) => {
        classCount++;
        const classId = typeof cls.class_id === 'string' && cls.class_id !== '' ? cls.class_id : undefined;
        const where = `${name} のクラス ${classId ?? `（${classIndex + 1}番目、class_id がない）`}`;
        if (!classId) {
            problem(where, 'class_id がない');
            return;
        }
        if (seenClassIds.has(classId)) {
            problem(where, 'class_id が重なっている');
            return;
        }
        seenClassIds.add(classId);
        if (cls.target_bit !== undefined) {
            const conditions = convert(where, cls.target_bit);
            if (conditions) {
                classes[classId] = applyIntensiveQuarter(where, conditions, cls.intensive_quarter);
                conditionCount++;
            }
        } else if (cls.intensive_quarter !== undefined) {
            problem(where, 'クラスに target_bit がないのに intensive_quarter がある（科目に書く）');
        } else if (course.target_bit === undefined) {
            // 科目にもクラスにもビットがないと、このクラスの条件が決まらない
            problem(where, '科目にもクラスにも target_bit がない');
        }
    });
    if (Object.keys(classes).length > 0) entry.classes = classes;
    output[course.id_name] = entry;
});

// 数：科目・クラスの数が元のシラバスと同じ
const rawClassCount = (raw as RawCourse[]).reduce((sum, c) => sum + (Array.isArray(c.classes) ? c.classes.length : 0), 0);
if (Object.keys(output).length !== raw.length) problem('全体', `科目の数が元のシラバス（${raw.length}）と違う（${Object.keys(output).length}）`);
if (classCount !== rawClassCount) problem('全体', `クラスの数が元のシラバス（${rawClassCount}）と違う（${classCount}）`);

if (problems.length > 0) {
    console.error(`止めました（${problems.length} 件）。${path.relative(root, outputPath)} は書きかえていません：`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
}

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n');
console.log(`書き出しました：${path.relative(root, outputPath)}（科目 ${courseCount}・クラス ${classCount}・条件 ${conditionCount}）`);
