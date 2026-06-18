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
        return res.status(500).json({ error: 'API Key is missing. Please set GOOGLE_API_KEY environment variable.' });
    }

    const { userProfile, courses } = req.body;

    const courseDetails = courses.map((c: any) => `- ${c.id_name}: (${c.credits} credits). Overview: ${c.outline}`).join('\n');

    const prompt = `
あなたは会津大学（U-Aizu）の教務や学生生活の裏表を知り尽くした、親しみにくいがなぜか憎めない「AI先輩」だ。言葉遣いは荒くぶっきらぼうだが、後輩の将来を誰よりも心配している熱い先輩として振舞え。

学生情報:
名前: ${userProfile.nickname}
大学: ${userProfile.university}
夢: ${userProfile.dreamJob || '未設定'}

選択科目:
${courseDetails}

タスク:
以下の制約を厳守して、学生の科目選択に厳しく、かつ愛のあるフィードバックを生成してください。
1. **必ず日本語で回答すること**。専門用語以外で英語は使わない。
2. **性格**: 決して褒めちぎるな。良い選択でも「会津の冬を舐めるな」と厳しくする。悪い選択には「地獄を見るぞ」と激しく怒るが、必ず具体的な「改善策」を提示すること。
3. **口調**: 「〜だろ」「〜じゃねえか」「会津の冬を舐めるな」「何やってんだ」といった乱暴な口調を混ぜつつ、内容は誠実に。
4. **具体的なアドバイス**: 各科目について、履修すべきかどうか、難易度、履修のタイミングなど具体的に指導すること。
5. **総合評価**: 全体のバランス、負担、将来の目標との関連性を評価すること。

以下のJSON形式で厳密に回答してください:
{
  "overallFeedback": "全体へのフィードバック",
  "courseFeedbacks": [
    {
      "courseId": "MA01",
      "courseName": "数学",
      "comment": "具体的なコメント"
    }
  ]
}`;

    try {
        const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            systemInstruction: "You MUST return your response ONLY in the following JSON format: { \"overallFeedback\": \"overall feedback text\", \"courseFeedbacks\": [ { \"courseId\": \"course ID\", \"courseName\": \"course name\", \"comment\": \"feedback comment\" } ] }. Do not include any markdown blocks (like ```json) or extra text outside the JSON."
        });
        const response = await model.generateContent(prompt);

        if (!response.response.text) {
            throw new Error('No response from AI');
        }

        const cleanedResponse = sanitizeJsonResponse(response.response.text());
        const parsed = JSON.parse(cleanedResponse);
        return res.status(200).json(parsed);
    } catch (error: any) {
        console.error('API Error:', error);
        // Fallback response structure
        return res.status(200).json({
            overallFeedback: "AI応答の解析に失敗しました",
            courseFeedbacks: courses.map((c: any) => ({
                courseId: c.id_name,
                courseName: c.id_name,
                comment: "評価不能"
            }))
        });
    }
}
