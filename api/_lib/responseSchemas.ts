// 3つの AI 窓口が Gemini に返させる JSON の形（structured outputs の JSON Schema）と、
// JSON.parse したあとの値が形に合うかを確かめる型ガード。
// 項目の名前は src/services/aiApi.ts のレスポンスの型と同じにする（api/ と src/ は互いに import しない）

export interface ConsultationResult {
    overallFeedback: string;
    courseFeedbacks: { courseId: string; courseName: string; comment: string }[];
}

export interface TimetablePatternsResult {
    patterns: {
        id: string;
        name: string;
        description: string;
        assignments: { courseId: string; classId: string }[];
    }[];
}

export interface GradeReactionResult {
    title: string;
    message: string;
}

const stringProperties = (names: string[]): Record<string, unknown> => ({
    type: "object",
    properties: Object.fromEntries(names.map(name => [name, { type: "string" }])),
    required: names,
});

export const consultationSchema: Record<string, unknown> = {
    type: "object",
    properties: {
        overallFeedback: { type: "string" },
        courseFeedbacks: { type: "array", items: stringProperties(["courseId", "courseName", "comment"]) },
    },
    required: ["overallFeedback", "courseFeedbacks"],
};

export const timetablePatternsSchema: Record<string, unknown> = {
    type: "object",
    properties: {
        patterns: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    description: { type: "string" },
                    assignments: { type: "array", items: stringProperties(["courseId", "classId"]) },
                },
                required: ["id", "name", "description", "assignments"],
            },
        },
    },
    required: ["patterns"],
};

export const gradeReactionSchema: Record<string, unknown> = stringProperties(["title", "message"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const hasStrings = (value: unknown, names: string[]): value is Record<string, unknown> =>
    isRecord(value) && names.every(name => typeof value[name] === "string");

export function isConsultationResult(value: unknown): value is ConsultationResult {
    return isRecord(value)
        && typeof value.overallFeedback === "string"
        && Array.isArray(value.courseFeedbacks)
        && value.courseFeedbacks.every(f => hasStrings(f, ["courseId", "courseName", "comment"]));
}

export function isTimetablePatternsResult(value: unknown): value is TimetablePatternsResult {
    return isRecord(value)
        && Array.isArray(value.patterns)
        && value.patterns.every(p =>
            hasStrings(p, ["id", "name", "description"])
            && Array.isArray(p.assignments)
            && p.assignments.every(a => hasStrings(a, ["courseId", "classId"])));
}

export function isGradeReactionResult(value: unknown): value is GradeReactionResult {
    return hasStrings(value, ["title", "message"]);
}
