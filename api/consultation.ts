import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Helper to safely load JSON file with path fallbacks
function safeLoadJSON(filename: string): any[] {
    const candidatePaths = [
        path.join(process.cwd(), "src/data", filename)
    ];

    if (typeof __dirname !== 'undefined') {
        candidatePaths.push(path.resolve(__dirname, "../src/data", filename));
        candidatePaths.push(path.resolve(__dirname, "../../src/data", filename));
    }

    for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
            try {
                return JSON.parse(fs.readFileSync(p, "utf-8"));
            } catch (err) {
                console.error(`Error parsing JSON from ${p}:`, err);
            }
        }
    }
    return [];
}

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

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log('\x1b[36m[Debug] CWD:\x1b[0m', process.cwd());
    console.log('\x1b[36m[Debug] __dirname:\x1b[0m', typeof __dirname !== 'undefined' ? __dirname : 'undefined');
    console.log('\x1b[36m[Debug] GOOGLE_API_KEY exists:\x1b[0m', !!process.env.GOOGLE_API_KEY);
    console.log('\x1b[36m[Debug] GEMINI_API_KEY exists:\x1b[0m', !!process.env.GEMINI_API_KEY);

    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'ここにAPIキーを入力してください') {
        console.error('\x1b[31m[Consultation API Error]: API Key is missing. Please set GOOGLE_API_KEY in .env file.\x1b[0m');
        return res.status(500).json({ error: 'API Key is missing. Please set GOOGLE_API_KEY in .env file.' });
    }

    const { userProfile, courses } = req.body || {};

    if (!courses || !Array.isArray(courses)) {
        console.error('\x1b[31m[Consultation API Error]: Invalid or missing courses array in request body.\x1b[0m');
        return res.status(400).json({ error: 'Invalid courses input' });
    }

    // Load extra review texts for RAG enhancement if available
    const reviewsTextData = safeLoadJSON("reviews_text.json");
    const reviewsTextMap = new Map<string, string>();
    reviewsTextData.forEach((item: any) => {
        if (item.id && item.comment) {
            reviewsTextMap.set(item.id, item.comment);
        }
    });

    const courseDetails = courses.map((c: any) => {
        const review = reviewsTextMap.get(c.id_name);
        const reviewStr = review ? ` (Review: "${review}")` : '';
        return `- ${c.id_name}: (${c.credits} credits). Overview: ${c.outline || ''}${reviewStr}`;
    }).join('\n');

    const prompt = `
あなたは会津大学（U-Aizu）の経験豊富だが、口が猛烈に悪い「AI先輩」だ。

【重要：キャラクター＆回答方針】
- 口調は高圧的で荒く、「〜だろ」「〜じゃねえか」「〜しろ」といった言葉遣い（ツンデレ・熱血風）を徹底すること。丁寧な言葉は使うな。
- ただし、内容は単なる説教や「甘えるな」という突き放しではなく、極めて実用的で愛のあるアドバイスであること。
- 先輩のリアルな口コミ（「課題が多い」など）を基に、それをどう攻略し将来の夢に直結させるのかを具体的に指導しろ。

【学生情報】
名前: ${userProfile?.nickname || '後輩'}
大学: ${userProfile?.university || '会津大学'}
将来の夢・目標: ${userProfile?.dreamJob || '未設定'}

【選択科目および先輩のリアル口コミ】:
${courseDetails}

【必須要件・文字数制限（厳密遵守）】
1. **overallFeedback (全体評価と夢)**: 選択科目の構成が、後輩の夢（${userProfile?.dreamJob || '未設定'}）にどう繋がるか。文字数は【約150文字】。
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
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            systemInstruction: "You MUST return your response ONLY in strict JSON format: { \"overallFeedback\": \"overall feedback text\", \"courseFeedbacks\": [ { \"courseId\": \"course ID\", \"courseName\": \"course name\", \"comment\": \"feedback comment\" } ] }. Do NOT include trailing commas in arrays or objects under any circumstances. Persona: harsh, tsundere/hot-blooded senior with highly practical advice in Japanese. Length constraint: overallFeedback around 150 characters, and each course comment around 150 characters. Do not include any markdown blocks or text outside the JSON."
        });
        const response = await model.generateContent(prompt);

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
            overallFeedback: "AI応答の解析に失敗しました。時間をおいて再度お試しください。",
            courseFeedbacks: courses.map((c: any) => ({
                courseId: c.id_name,
                courseName: c.id_name,
                comment: "評価不能"
            }))
        });
    }
}
