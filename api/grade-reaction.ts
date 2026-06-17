import { GoogleGenerativeAI } from "@google/generative-ai";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const sanitizeJsonResponse = (responseText: string): string => {
    let cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '');
    cleaned = cleaned.trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        cleaned = jsonMatch[0];
    }
    return cleaned;
};

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'ここにAPIキーを入力してください') {
        return res.status(500).json({ error: 'API Key is missing.' });
    }

    const { userProfile, grades } = req.body;

    const enteredGrades = grades.filter((g: any) => g.grade && g.grade.trim() !== '');
    if (enteredGrades.length === 0) {
        return res.status(200).json({ reaction: "成績入力してから来いよ！評価不能だ。" });
    }

    const gradeDetails = enteredGrades.map((g: any) => `- ${g.courseName}: ${g.grade}`).join('\n');
    const totalPoints = enteredGrades.reduce((sum: number, g: any) => {
        const gradePoint = userProfile.gradingScale.find((s: any) => s.label === g.grade)?.point || 0;
        return sum + (gradePoint * g.credits);
    }, 0);
    const totalCredits = enteredGrades.reduce((sum: number, g: any) => sum + g.credits, 0);
    const semesterGpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';

    const prompt = `
あなたは会津大学（U-Aizu）の教務や学生生活の裏表を知り尽くした「AI先輩」だ。
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

【出力構成（150文字以内・簡潔に！）】
称号: 『〜〜〜』
本文（挨拶不要、目立つ科目に1つ触れて短文の連撃で！）
アドバイス（一言で仕留めろ）

以下のJSON形式で厳密に回答してください:
{
  "response": "称号: 『〜〜〜』\n本文\nアドバイス"
}
`;

    try {
        const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash",
            systemInstruction: "You MUST return your response ONLY in the following JSON format: { \"response\": \"your_message_here\" }. Do not include any markdown blocks (like ```json), extra text, or line breaks outside the JSON."
        });
        const response = await model.generateContent(prompt);
        
        if (!response.response.text) {
            throw new Error('No response from AI');
        }

        const cleanedResponse = sanitizeJsonResponse(response.response.text());
        const parsed = JSON.parse(cleanedResponse);
        return res.status(200).json({ reaction: parsed.response || "AI応答の解析に失敗しました" });
    } catch (error: any) {
        console.error('API Error:', error);
        return res.status(200).json({ reaction: "AI先輩は今忙しいようだ。後で出直してこい。" });
    }
}
