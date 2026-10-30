import { getCourse } from "./syllabus.js";
import type { CatalogCourse } from "./syllabus.js";

// AI 窓口に届いた入力の上限と形を確かめ、AI に渡す値を作る。
// 科目は ID だけを信じ、中身はサーバーのシラバスから引き直す（送られた文章はプロンプトに使わない）

/** 入力の上限。値を変えるときはここだけを直し、src/config/inputLimits.ts もそろえる */
export const INPUT_LIMITS = {
    maxCourses: 40,             // 1回の依頼の科目数
    maxGrades: 40,              // 1回の依頼の成績の件数
    maxProfileText: 100,        // ニックネーム・なりたい職業・大学名の文字数
    maxIdLength: 200,           // 科目 ID の文字数
    maxShortText: 50,           // クラス ID・ベースクラス・成績の名前の文字数
    maxGradingScaleEntries: 20, // 成績の段階の数
} as const;

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; issue: string };

export interface ProfileInput {
    nickname: string;
    dreamJob: string;
    university: string;
}

export interface GradingScaleEntry {
    label: string;
    point: number;
}

export interface ConsultationInput {
    profile: ProfileInput;
    courses: CatalogCourse[];
}

export interface TimetablePatternsInput {
    courses: CatalogCourse[];
    baseClass: string;
    /** 送られた科目にあり、その科目の開講クラスにあるピンだけ */
    pinnedClasses: Record<string, string>;
}

export interface GradeReactionInput {
    profile: ProfileInput;
    gradingScale: GradingScaleEntry[];
    /** 成績が空でないものだけ */
    grades: { course: CatalogCourse; grade: string }[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const fail = (issue: string): { ok: false; issue: string } => ({ ok: false, issue });

/** 文字列か（なければ空文字）。上限を超える・文字列でなければ null */
function optionalText(value: unknown, maxLength: number): string | null {
    if (value === undefined || value === null) return "";
    if (typeof value !== "string" || value.length > maxLength) return null;
    return value;
}

function parseProfile(value: unknown): ValidationResult<ProfileInput> {
    if (!isRecord(value)) return fail("userProfile がない");
    const nickname = optionalText(value.nickname, INPUT_LIMITS.maxProfileText);
    const dreamJob = optionalText(value.dreamJob, INPUT_LIMITS.maxProfileText);
    const university = optionalText(value.university, INPUT_LIMITS.maxProfileText);
    if (nickname === null) return fail("nickname が長すぎるか文字列でない");
    if (dreamJob === null) return fail("dreamJob が長すぎるか文字列でない");
    if (university === null) return fail("university が長すぎるか文字列でない");
    return { ok: true, value: { nickname, dreamJob, university } };
}

/** 科目 ID を確かめてシラバスから引く。同じ ID は1つにまとめる */
function resolveCourseIds(ids: unknown[]): ValidationResult<CatalogCourse[]> {
    const courses: CatalogCourse[] = [];
    const seen = new Set<string>();
    for (const id of ids) {
        if (typeof id !== "string" || id === "" || id.length > INPUT_LIMITS.maxIdLength) return fail("科目 ID の形が違う");
        if (seen.has(id)) continue;
        const course = getCourse(id);
        if (!course) return fail("知らない科目 ID");
        seen.add(id);
        courses.push(course);
    }
    return { ok: true, value: courses };
}

function parseCourseList(value: unknown): ValidationResult<CatalogCourse[]> {
    if (!Array.isArray(value) || value.length === 0) return fail("courses がないか空");
    if (value.length > INPUT_LIMITS.maxCourses) return fail("courses が多すぎる");
    const ids: unknown[] = [];
    for (const item of value) {
        if (!isRecord(item)) return fail("courses の要素がオブジェクトでない");
        ids.push(item.id_name);
    }
    return resolveCourseIds(ids);
}

export function validateConsultationInput(body: unknown): ValidationResult<ConsultationInput> {
    if (!isRecord(body)) return fail("本文がオブジェクトでない");
    const profile = parseProfile(body.userProfile);
    if (!profile.ok) return profile;
    const courses = parseCourseList(body.courses);
    if (!courses.ok) return courses;
    return { ok: true, value: { profile: profile.value, courses: courses.value } };
}

export function validateTimetablePatternsInput(body: unknown): ValidationResult<TimetablePatternsInput> {
    if (!isRecord(body)) return fail("本文がオブジェクトでない");
    const courses = parseCourseList(body.courses);
    if (!courses.ok) return courses;
    const baseClass = optionalText(body.baseClass, INPUT_LIMITS.maxShortText);
    if (baseClass === null) return fail("baseClass が長すぎるか文字列でない");

    // ピンは、送られた科目にない・開講クラスにないものを捨てる（古いピンは普通に起こるので依頼は断らない）
    const pinnedClasses: Record<string, string> = {};
    const rawPins = body.pinnedClasses;
    if (rawPins !== undefined && rawPins !== null) {
        if (!isRecord(rawPins)) return fail("pinnedClasses がオブジェクトでない");
        const entries = Object.entries(rawPins);
        if (entries.length > INPUT_LIMITS.maxCourses) return fail("pinnedClasses が多すぎる");
        for (const [courseId, classId] of entries) {
            if (typeof classId !== "string" || classId.length > INPUT_LIMITS.maxShortText) return fail("pinnedClasses の値の形が違う");
            const course = courses.value.find(c => c.id === courseId);
            if (course && course.classes.some(c => c.classId === classId)) {
                pinnedClasses[courseId] = classId;
            }
        }
    }
    return { ok: true, value: { courses: courses.value, baseClass, pinnedClasses } };
}

export function validateGradeReactionInput(body: unknown): ValidationResult<GradeReactionInput> {
    if (!isRecord(body)) return fail("本文がオブジェクトでない");
    const profile = parseProfile(body.userProfile);
    if (!profile.ok) return profile;

    const rawScale = isRecord(body.userProfile) ? body.userProfile.gradingScale : undefined;
    if (!Array.isArray(rawScale) || rawScale.length === 0 || rawScale.length > INPUT_LIMITS.maxGradingScaleEntries) {
        return fail("gradingScale がないか多すぎる");
    }
    const gradingScale: GradingScaleEntry[] = [];
    for (const s of rawScale) {
        if (!isRecord(s) || typeof s.label !== "string" || s.label === "" || s.label.length > INPUT_LIMITS.maxShortText
            || typeof s.point !== "number" || !Number.isFinite(s.point) || s.point < 0) {
            return fail("gradingScale の要素の形が違う");
        }
        gradingScale.push({ label: s.label, point: s.point });
    }

    if (!Array.isArray(body.grades)) return fail("grades がない");
    if (body.grades.length > INPUT_LIMITS.maxGrades) return fail("grades が多すぎる");
    const grades: { course: CatalogCourse; grade: string }[] = [];
    for (const g of body.grades) {
        if (!isRecord(g)) return fail("grades の要素がオブジェクトでない");
        const grade = optionalText(g.grade, INPUT_LIMITS.maxShortText);
        if (grade === null) return fail("grade が長すぎるか文字列でない");
        const resolved = resolveCourseIds([g.courseId]);
        if (!resolved.ok) return resolved;
        if (grade.trim() !== "") grades.push({ course: resolved.value[0], grade });
    }
    return { ok: true, value: { profile: profile.value, gradingScale, grades } };
}
