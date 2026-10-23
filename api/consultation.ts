import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { withGeminiRetry, getGeminiErrorMessage } from "./_lib/geminiRetry.js";
import { getHeader, sendError } from "./_lib/http.js";
import type { ApiRequest, ApiResponse } from "./_lib/http.js";
import { verifyIdToken, authFailureResponse } from "./_lib/auth.js";
import { validateConsultationInput } from "./_lib/validation.js";
import type { ConsultationInput, ValidationResult } from "./_lib/validation.js";
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
        console.warn(`[Consultation API] 認証で断りました: ${auth.reason}`);
        const failure = authFailureResponse(auth.reason);
        return sendError(res, failure.status, failure.code);
    }

    let validation: ValidationResult<ConsultationInput>;
    try {
        validation = validateConsultationInput(req.body);
    } catch (err) {
        if (err instanceof SyllabusUnavailableError) {
            console.error('[Consultation API] シラバスを読み込めません:', err.message);
            return sendError(res, 500, 'server_misconfigured');
        }
        throw err;
    }
    if (!validation.ok) {
        console.warn(`[Consultation API] 入力で断りました: ${validation.issue}`);
        return sendError(res, 400, 'invalid_input');
    }
    const { profile: userProfile, courses } = validation.value;

    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'ここにAPIキーを入力してください') {
        console.error('\x1b[31m[Consultation API Error]: API Key is missing. Please set GOOGLE_API_KEY in .env file.\x1b[0m');
        return sendError(res, 500, 'server_misconfigured');
    }

    // 科目の中身（概要・単位・口コミ本文）はサーバーのシラバスから引いた値を使う
    const courseDetails = courses.map(c => {
        const reviewStr = c.reviewComment ? ` (Review: "${c.reviewComment}")` : '';
        return `- ${c.id}: (${c.credits} credits). Overview: ${c.outline}${reviewStr}`;
    }).join('\n');

    const prompt = `
あなたは会津大学（U-Aizu）の経験豊富だが、口が猛烈に悪い「コマどり先輩」だ。
あなたは会津大学に住みついているコマドリ（鳥）の先輩という設定だ。

【重要：キャラクター＆回答方針】
- 口調は高圧的で荒く、「〜だろ」「〜じゃねえか」「〜しろ」といった言葉遣い（ツンデレ・熱血風）を徹底すること。丁寧な言葉は使うな。
- ただし、内容は単なる説教や「甘えるな」という突き放しではなく、極めて実用的で愛のあるアドバイスであること。
- 先輩のリアルな口コミ（「課題が多い」など）を基に、それをどう攻略し将来の夢に直結させるのかを具体的に指導しろ。

【学生情報】
名前: ${userProfile.nickname || '後輩'}
大学: ${userProfile.university || '会津大学'}
将来の夢・目標: ${userProfile.dreamJob || '未設定'}

【選択科目および先輩のリアル口コミ】:
${courseDetails}

【必須要件・文字数制限（厳密遵守）】
1. **overallFeedback (全体評価と夢)**: 選択科目の構成が、後輩の夢（${userProfile.dreamJob || '未設定'}）にどう繋がるか。文字数は【約150文字】。
2. **各科目の comment (口コミ対策)**: 該当科目の口コミ懸念点をどう攻略し自分の力にするか。各科目ごとに【約150文字】。

【レスポンスJSONフォーマット】
以下のJSONフォーマットのみを厳密に出力してください（出力は厳格なJSONフォーマットのみとし、配列やオブジェクトの末尾にカンマ（Trailing Comma）を絶対に入れないこと）:
{
  "overallFeedback": "全体的な評価と夢への接続。高圧的だが的確なアドバイス（約150文字）",
  "courseFeedbacks": [
    {
      "courseId": "科目ID",
      "courseName": "科目名",
      "comment": "口コミを踏まえた具体的な攻略法と厳しい激励（約150文字）"
    }
  ]
}`;

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const response = await withGeminiRetry((modelName) =>
            genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: "You MUST return your response ONLY in strict JSON format: { \"overallFeedback\": \"overall feedback text\", \"courseFeedbacks\": [ { \"courseId\": \"course ID\", \"courseName\": \"course name\", \"comment\": \"feedback comment\" } ] }. Do NOT include trailing commas in arrays or objects under any circumstances. Persona: harsh, tsundere/hot-blooded senior with highly practical advice in Japanese. Length constraint: overallFeedback around 150 characters, and each course comment around 150 characters. Do not include any markdown blocks or text outside the JSON."
            }).generateContent(prompt)
        );

        if (!response.response.text) {
            throw new Error('No response text returned from Gemini API');
        }

        const rawText = response.response.text();
        // クレンジング処理（マークダウン除去・トリム・JSON部分抽出）
        const cleanedText = sanitizeJsonResponse(rawText);

        try {
            const parsed = JSON.parse(cleanedText);
            return res.status(200).json(parsed);
        } catch (parseError) {
            console.error("JSON Parse Error. Raw output from Gemini:", rawText);
            console.error("Cleaned text attempted:", cleanedText);
            throw parseError;
        }
    } catch (error: any) {
        console.error('\x1b[31m[Consultation API Error Details]:\x1b[0m', error.stack || error.message || error);
        // Fallback response structure
        return res.status(200).json({
            overallFeedback: getGeminiErrorMessage(error),
            courseFeedbacks: courses.map(c => ({
                courseId: c.id,
                courseName: c.id,
                comment: "この科目は今回はノーコメントだ"
            }))
        });
    }
}
