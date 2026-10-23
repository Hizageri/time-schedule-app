import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { withGeminiRetry, isGeminiBusyError, getGeminiErrorMessage, GENERAL_ERROR_MESSAGE } from "./_lib/geminiRetry.js";
import { getHeader, sendError } from "./_lib/http.js";
import type { ApiRequest, ApiResponse } from "./_lib/http.js";
import { verifyIdToken, authFailureResponse } from "./_lib/auth.js";
import { validateGradeReactionInput } from "./_lib/validation.js";
import type { GradeReactionInput, ValidationResult } from "./_lib/validation.js";
import { SyllabusUnavailableError } from "./_lib/syllabus.js";

dotenv.config();

const sanitizeJsonResponse = (responseText: string): string => {
    let cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '');
    cleaned = cleaned.trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        cleaned = jsonMatch[0];
    }
    // 末尾のカンマ（Trailing Comma）を削除
    cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
    return cleaned;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
    // 前処理：メソッド → 認証 → 入力の確認 → API キー。通らなければ Gemini を呼ばない
    if (req.method !== 'POST') {
        return sendError(res, 405, 'method_not_allowed');
    }

    const auth = await verifyIdToken(getHeader(req, 'authorization'));
    if (!auth.ok) {
        console.warn(`[Grade Reaction API] 認証で断りました: ${auth.reason}`);
        const failure = authFailureResponse(auth.reason);
        return sendError(res, failure.status, failure.code);
    }

    let validation: ValidationResult<GradeReactionInput>;
    try {
        validation = validateGradeReactionInput(req.body);
    } catch (err) {
        if (err instanceof SyllabusUnavailableError) {
            console.error('[Grade Reaction API] シラバスを読み込めません:', err.message);
            return sendError(res, 500, 'server_misconfigured');
        }
        throw err;
    }
    if (!validation.ok) {
        console.warn(`[Grade Reaction API] 入力で断りました: ${validation.issue}`);
        return sendError(res, 400, 'invalid_input');
    }
    // 成績が空のものは確認の段階で除いてある。科目名・単位はサーバーのシラバスから引いた値
    const { gradingScale, grades: enteredGrades } = validation.value;

    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'ここにAPIキーを入力してください') {
        console.error('\x1b[31m[Grade Reaction API Error]: API Key is missing.\x1b[0m');
        return sendError(res, 500, 'server_misconfigured');
    }

    if (enteredGrades.length === 0) {
        return res.status(200).json({ title: "未評価", message: "成績入力してから来いよ！評価不能だ。" });
    }

    const gradeDetails = enteredGrades.map(g => `- ${g.course.id}: ${g.grade}`).join('\n');
    const totalPoints = enteredGrades.reduce((sum, g) => {
        const gradePoint = gradingScale.find(s => s.label === g.grade)?.point || 0;
        return sum + (gradePoint * g.course.credits);
    }, 0);
    const totalCredits = enteredGrades.reduce((sum, g) => sum + g.course.credits, 0);
    const semesterGpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';

    const prompt = `
あなたはお世話になっている会津大学（U-Aizu）の経験豊富で頼れるが、口が荒く高圧的な「コマどり先輩」だ。
あなたは会津大学に住みついているコマドリ（鳥）の先輩という設定だ。
学期末、成績表を手に報告に来た後輩に対し、GPA「${semesterGpa}」と成績「${gradeDetails}」を見て態度を豹変させろ。

【態度の豹変ルール（最優先・厳守）】
1. GPA 3.5以上【崇拝モード】:
   - 態度: 驚愕、平伏、猛烈な媚び。
   - 口調: 極めて丁寧な敬語。「流石は会津の宝！」「一生付いていきます！」と称えろ。
2. GPA 2.0 〜 3.4【通常・ツンデレモード】:
   - 態度: ぶっきらぼう、突き放し、微かな期待。
   - 口調: 「〜だろ」「〜じゃねえか」。「冬の会津を舐めずに、最低限はやれよ」と返せ。
3. GPA 2.0未満【冷酷・ゴミを見る目モード】:
   - 態度: 徹底的な軽蔑、罵倒、絶縁。
   - 口調: 「お前、大学に何しに来てんの？」「学食のカレーを食う資格もねえよ」と徹底的に煽れ。

【出力要件】
- title: 成績や状況を表すユニークでインパクトのある称号（例: 『単位乞食の生存者』『会津の神童』など）
- message: 本文とアドバイスを明確に区切らず、会話の流れの中で自然にアドバイスを組み込んで、1つのまとまったセリフとして出力してください（約150文字程度）。

以下のJSONフォーマットのみを厳密に出力してください:
{
  "title": "称号",
  "message": "評価とアドバイスを統合した一続きのセリフ"
}
`;

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const response = await withGeminiRetry((modelName) =>
            genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: "You MUST return your response ONLY in the following JSON format: { \"title\": \"称号\", \"message\": \"評価とアドバイスを統合した一続きのセリフ\" }. Persona: AI Senior in Japanese. Do not separate body and advice; integrate them into a single continuous natural spoken message from the persona. Do not include any markdown blocks or text outside the JSON."
            }).generateContent(prompt)
        );
        
        if (!response.response.text) {
            throw new Error('No response from AI');
        }

        const rawText = response.response.text();
        const cleanedResponse = sanitizeJsonResponse(rawText);

        try {
            const parsed = JSON.parse(cleanedResponse);
            return res.status(200).json({
                title: parsed.title || "コマどり先輩の評価",
                message: parsed.message || parsed.response || GENERAL_ERROR_MESSAGE
            });
        } catch (parseErr) {
            console.error("JSON Parse Error. Raw output from Gemini:", rawText);
            throw parseErr;
        }
    } catch (error: any) {
        console.error('\x1b[31m[Grade Reaction API Error Details]:\x1b[0m', error.stack || error.message || error);
        return res.status(200).json({
            title: isGeminiBusyError(error) ? "順番待ちの後輩" : "出直しの後輩",
            message: getGeminiErrorMessage(error)
        });
    }
}
