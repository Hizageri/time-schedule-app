import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

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

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'ここにAPIキーを入力してください') {
        console.error('\x1b[31m[Grade Reaction API Error]: API Key is missing.\x1b[0m');
        return res.status(500).json({ error: 'API Key is missing.' });
    }

    const { userProfile, grades } = req.body || {};

    const enteredGrades = (grades || []).filter((g: any) => g.grade && g.grade.trim() !== '');
    if (enteredGrades.length === 0) {
        return res.status(200).json({ title: "未評価", message: "成績入力してから来いよ！評価不能だ。" });
    }

    const gradeDetails = enteredGrades.map((g: any) => `- ${g.courseName}: ${g.grade}`).join('\n');
    const totalPoints = enteredGrades.reduce((sum: number, g: any) => {
        const gradePoint = userProfile?.gradingScale?.find((s: any) => s.label === g.grade)?.point || 0;
        return sum + (gradePoint * g.credits);
    }, 0);
    const totalCredits = enteredGrades.reduce((sum: number, g: any) => sum + g.credits, 0);
    const semesterGpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';

    const prompt = `
あなたはお世話になっている会津大学（U-Aizu）の経験豊富で頼れるが、口が荒く高圧的な「AI先輩」だ。
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
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            systemInstruction: "You MUST return your response ONLY in the following JSON format: { \"title\": \"称号\", \"message\": \"評価とアドバイスを統合した一続きのセリフ\" }. Persona: AI Senior in Japanese. Do not separate body and advice; integrate them into a single continuous natural spoken message from the persona. Do not include any markdown blocks or text outside the JSON."
        });
        const response = await model.generateContent(prompt);
        
        if (!response.response.text) {
            throw new Error('No response from AI');
        }

        const rawText = response.response.text();
        const cleanedResponse = sanitizeJsonResponse(rawText);

        try {
            const parsed = JSON.parse(cleanedResponse);
            return res.status(200).json({
                title: parsed.title || "AI先輩の評価",
                message: parsed.message || parsed.response || "AI応答の解析に失敗しました"
            });
        } catch (parseErr) {
            console.error("JSON Parse Error. Raw output from Gemini:", rawText);
            throw parseErr;
        }
    } catch (error: any) {
        console.error('\x1b[31m[Grade Reaction API Error Details]:\x1b[0m', error.stack || error.message || error);
        return res.status(200).json({
            title: "通信エラー",
            message: "AI先輩は今忙しいようだ。後で出直してこい。"
        });
    }
}
