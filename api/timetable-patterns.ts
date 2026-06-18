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

    const { courses, baseClass } = req.body;

    const courseClassMap = courses.map((course: any) => {
        return {
            courseId: course.id_name,
            courseTitle: course.id_name,
            availableClasses: course.classes.map((c: any) => ({
                classId: c.class_id,
                schedule: c.schedule // array like ["月-1", "木-2"]
            }))
        };
    });

    const prompt = `
あなたは超高性能な時間割スケジューリングAIです。
学生が選択した科目と、それぞれのクラス（コマ）の情報は以下の通りです。
${JSON.stringify(courseClassMap, null, 2)}

タスク:
各科目から必ず1つのクラスを選び、5パターンの時間割を作成してください。
【重要ルール】
- **最優先事項**: **「コマの重複（重なり）」を可能な限りゼロにすること。** 重複がないスケジュールを出すことが、パターンの特徴よりも重要です。
- **必ず日本語で回答すること**。
- **「作成不可能」という回答は禁止。
- **ベースクラスの活用**: 学生は「${baseClass}」をベースのクラスとして選択しています。科目の中に「${baseClass}」という名前のクラスがある(または名前を含むクラスがある)場合は、それを最優先で選択してください。
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
        const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            systemInstruction: "You MUST return your response ONLY in the following JSON format: { \"patterns\": [ { \"id\": \"pattern id\", \"name\": \"pattern name\", \"description\": \"description text\", \"assignments\": [ { \"courseId\": \"course ID\", \"classId\": \"class ID\" } ] } ] }. Do not include any markdown blocks (like ```json) or extra text outside the JSON."
        });
        const response = await model.generateContent(prompt);
        
        if (!response.response.text) {
            throw new Error('No response from AI');
        }

        const cleanedResponse = sanitizeJsonResponse(response.response.text());
        const result = JSON.parse(cleanedResponse);
        return res.status(200).json(result);
    } catch (error: any) {
        console.error('API Error:', error);
        return res.status(200).json({
            patterns: [
                {id: "p1", name: "AIおすすめ", description: "生成エラー", assignments: []},
                {id: "p2", name: "休日最大化", description: "生成エラー", assignments: []},
                {id: "p3", name: "朝限回避", description: "生成エラー", assignments: []},
                {id: "p4", name: "遅い時間回避", description: "生成エラー", assignments: []},
                {id: "p5", name: "空きコマ削減", description: "生成エラー", assignments: []}
            ]
        });
    }
}
