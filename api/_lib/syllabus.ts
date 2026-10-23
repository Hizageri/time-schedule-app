import fs from "fs";
import path from "path";

// サーバー側のシラバス（src/data/*.json）。AI 窓口は、送られた科目 ID からここで中身を引き、
// 送られた文章をプロンプトに使わない。api/ は src/ のコードを import しない決まりなので fs で読む
// （vercel.json の includeFiles で関数に同梱している）

export interface CatalogClass {
    classId: string;
    schedule: string[];
}

export interface CatalogCourse {
    id: string;              // id_name
    credits: number;
    outline: string;
    reviewComment?: string;  // reviews_text.json の本文
    classes: CatalogClass[]; // class_id と schedule がそろっているものだけ
}

export class SyllabusUnavailableError extends Error {}

let catalog: Map<string, CatalogCourse> | null = null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

function readDataFile(filename: string): unknown {
    const candidatePaths = [path.join(process.cwd(), "src/data", filename)];
    if (typeof __dirname !== "undefined") {
        candidatePaths.push(path.resolve(__dirname, "../../src/data", filename));
        candidatePaths.push(path.resolve(__dirname, "../../../src/data", filename));
    }
    for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
            return JSON.parse(fs.readFileSync(p, "utf-8"));
        }
    }
    throw new SyllabusUnavailableError(`${filename} が見つかりません`);
}

function toCatalogClasses(value: unknown): CatalogClass[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((c): CatalogClass[] => {
        if (!isRecord(c) || typeof c.class_id !== "string" || !Array.isArray(c.schedule)) return [];
        const schedule = c.schedule.filter((s): s is string => typeof s === "string");
        return [{ classId: c.class_id, schedule }];
    });
}

function loadCatalog(): Map<string, CatalogCourse> {
    let syllabus: unknown;
    let reviews: unknown;
    try {
        syllabus = readDataFile("syllabus.json");
        reviews = readDataFile("reviews_text.json");
    } catch (err) {
        if (err instanceof SyllabusUnavailableError) throw err;
        throw new SyllabusUnavailableError(`シラバスを読み込めません: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (!Array.isArray(syllabus) || !Array.isArray(reviews)) {
        throw new SyllabusUnavailableError("シラバスの形が想定と違います");
    }

    const reviewMap = new Map<string, string>();
    for (const r of reviews) {
        if (isRecord(r) && typeof r.id === "string" && typeof r.comment === "string") {
            reviewMap.set(r.id, r.comment);
        }
    }

    const map = new Map<string, CatalogCourse>();
    for (const c of syllabus) {
        if (!isRecord(c) || typeof c.id_name !== "string") continue;
        map.set(c.id_name, {
            id: c.id_name,
            credits: typeof c.credits === "number" ? c.credits : 0,
            outline: typeof c.outline === "string" ? c.outline : "",
            reviewComment: reviewMap.get(c.id_name),
            classes: toCatalogClasses(c.classes),
        });
    }
    if (map.size === 0) {
        throw new SyllabusUnavailableError("シラバスに科目がありません");
    }
    return map;
}

/** 科目 ID で科目を引く。見つからなければ undefined。シラバスを読めないときは SyllabusUnavailableError */
export function getCourse(id: string): CatalogCourse | undefined {
    if (!catalog) catalog = loadCatalog();
    return catalog.get(id);
}
