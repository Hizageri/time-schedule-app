import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { withGeminiRetry, getGeminiErrorMessage } from "./_lib/geminiRetry.js";
import { getHeader, sendError } from "./_lib/http.js";
import type { ApiRequest, ApiResponse } from "./_lib/http.js";
import { verifyIdToken, authFailureResponse } from "./_lib/auth.js";
import { validateTimetablePatternsInput } from "./_lib/validation.js";
import type { TimetablePatternsInput, ValidationResult } from "./_lib/validation.js";
import { SyllabusUnavailableError } from "./_lib/syllabus.js";

dotenv.config();

const sanitizeJsonResponse = (responseText: string): string => {
    let cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '');
    cleaned = cleaned.trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        cleaned = jsonMatch[0];
    }
    return cleaned;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
    // 前処理：メソッド → 認証 → 入力の確認 → API キー。通らなければ Gemini を呼ばない
    if (req.method !== 'POST') {
        return sendError(res, 405, 'method_not_allowed');
    }

    const auth = await verifyIdToken(getHeader(req, 'authorization'));
    if (!auth.ok) {
        console.warn(`[Timetable Patterns API] 認証で断りました: ${auth.reason}`);
        const failure = authFailureResponse(auth.reason);
        return sendError(res, failure.status, failure.code);
    }

    let validation: ValidationResult<TimetablePatternsInput>;
    try {
        validation = validateTimetablePatternsInput(req.body);
    } catch (err) {
        if (err instanceof SyllabusUnavailableError) {
            console.error('[Timetable Patterns API] シラバスを読み込めません:', err.message);
            return sendError(res, 500, 'server_misconfigured');
        }
        throw err;
    }
    if (!validation.ok) {
        console.warn(`[Timetable Patterns API] 入力で断りました: ${validation.issue}`);
        return sendError(res, 400, 'invalid_input');
    }
    // ピンは、送られた科目の開講クラスにあるものだけが残っている
    const { courses, baseClass, pinnedClasses } = validation.value;

    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'ここにAPIキーを入力してください') {
        console.error('\x1b[31m[Timetable Patterns API Error]: API Key is missing.\x1b[0m');
        return sendError(res, 500, 'server_misconfigured');
    }

    // クラスとコマはサーバーのシラバスから引いた値を使う
    const courseClassMap = courses.map(course => ({
        courseId: course.id,
        courseTitle: course.id,
        availableClasses: course.classes.map(c => ({
            classId: c.classId,
            schedule: c.schedule // array like ["月-1", "木-2"]
        }))
    }));

    // ピン留めしたクラスは、すべてのパターンで必ず選ばせる（返ってきた結果はブラウザ側でもピンに合わせる）
    const pinnedEntries = Object.entries(pinnedClasses);
    const pinnedRule = pinnedEntries.length > 0
        ? `- **ピン留め（固定）**: 次の科目は、5つのパターンすべてで指定のクラスを必ず選んでください。ほかの科目は、固定したクラスと重ならないように選んでください。\n${pinnedEntries.map(([courseId, classId]) => `  - ${courseId} → ${classId}`).join('\n')}\n`
        : '';

    const prompt = `
あなたは超高性能な時間割スケジューリングAIです。
学生が選択した科目と、それぞれのクラス（コマ）の情報は以下の通りです。
${JSON.stringify(courseClassMap, null, 2)}

タスク:
各科目から必ず1つのクラスを選び、5パターンの時間割を作成してください。
【重要ルール】
- **最優先事項**: **「コマの重複（重なり）」を可能な限りゼロにすること。** 重複がないスケジュールを出すことが、パターンの特徴よりも重要です。
${pinnedRule}- **必ず日本語で回答すること**。
- **「作成不可能」という回答は禁止。
- **ベースクラスの活用**: 学生は「${baseClass || ''}」をベースのクラスとして選択しています。科目の中に「${baseClass || ''}」という名前のクラスがある(または名前を含むクラスがある)場合は、それを最優先で選択してください。
- **パターンの説明**: 'description' は、なぜそのパターンがその名前にふさわしいか、簡潔な定型文で回答してください。AIからの余計な挨拶や長文の解説は不要です。

以下の5つの名前でパターンを作成してください:
1. "AIおすすめ"
2. "授業がない日を最大限作る"
3. "１限などの朝はやい授業をまるべく減らす"
4. "遅い方をなるべく減らす"
5. "授業間の空きコマをなるべく減らす"

以下のJSON形式で厳密に回答してください:
{
  "patterns": [
    {
      "id": "pattern1",
      "name": "AIおすすめ",
      "description": "何も入れなくて良い",
      "assignments": [
        { "courseId": "MA01", "classId": "C1" }
      ]
    }
  ]
}
`;

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const response = await withGeminiRetry((modelName) =>
            genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: "You MUST return your response ONLY in the following JSON format: { \"patterns\": [ { \"id\": \"pattern id\", \"name\": \"pattern name\", \"description\": \"description text\", \"assignments\": [ { \"courseId\": \"course ID\", \"classId\": \"class ID\" } ] } ] }. Do not include any markdown blocks (like ```json) or extra text outside the JSON."
            }).generateContent(prompt)
        );
        
        if (!response.response.text) {
            throw new Error('No response from AI');
        }

        const cleanedResponse = sanitizeJsonResponse(response.response.text());
        const result = JSON.parse(cleanedResponse);
        return res.status(200).json(result);
    } catch (error: any) {
        console.error('\x1b[31m[Timetable Patterns API Error Details]:\x1b[0m', error.stack || error.message || error);
        const errorMessage = getGeminiErrorMessage(error);
        return res.status(200).json({
            patterns: [
                {id: "p1", name: "AIおすすめ", description: errorMessage, assignments: []},
                {id: "p2", name: "休日最大化", description: errorMessage, assignments: []},
                {id: "p3", name: "朝限回避", description: errorMessage, assignments: []},
                {id: "p4", name: "遅い時間回避", description: errorMessage, assignments: []},
                {id: "p5", name: "空きコマ削減", description: errorMessage, assignments: []}
            ]
        });
    }
}
