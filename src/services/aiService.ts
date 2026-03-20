import { GoogleGenAI } from '@google/genai';
import type { CourseData, AppState } from '../types';

// Use standard Vite env variable for the API key
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Initialize the SDK
// If the key is missing, it will throw when calling the API, which we should catch in the UI.
const ai = new GoogleGenAI(GEMINI_API_KEY ? { apiKey: GEMINI_API_KEY } : {});

export interface ConsultationResponse {
    overallFeedback: string;
    courseFeedbacks: {
        courseId: string;
        courseName: string;
        comment: string;
    }[];
}

export interface TimetablePatternsResponse {
    patterns: {
        id: string;
        name: string; // e.g. "AIおすすめ", "授業がない日を最大限作る"
        description: string;
        assignments: {
            courseId: string;
            classId: string;
        }[];
    }[];
}

export const generateConsultation = async (
    userProfile: AppState['userProfile'],
    courses: CourseData[]
): Promise<ConsultationResponse> => {
    if (!GEMINI_API_KEY) {
        throw new Error('API Key is missing. Please set VITE_GEMINI_API_KEY in your .env file.');
    }

    const courseDetails = courses.map(c => `- ${c.id_name}: (${c.credits} credits). Overview: ${c.outline}`).join('\n');

    const prompt = `
あなたは会津大学の教務に精通した、少し口の悪い「AI先輩」です。
学生の情報:
名前: ${userProfile.nickname}
将来の目標: ${userProfile.dreamJob || '未設定（喝を入れてください）'}

選択された科目:
${courseDetails}

タスク:
以下の制約を厳守して、学生の履修計画にアドバイスしてください。
1. **必ず日本語で回答すること**。専門用語以外で英語は使わない。
2. 'overallFeedback' には、全体のバランスや目標への適合性を書く。褒めるだけでなく、厳しい批判や「これ取らないと3年で詰むぞ」といった助言も入れること。
3. 'courseFeedbacks' 配列には、各科目ごとに「なぜ必要か」または「なぜ不要か」を目標に紐付けて書く。

以下のJSON形式で厳密に回答してください:
{
  "overallFeedback": "全体への熱いアドバイス（日本語）",
  "courseFeedbacks": [
    {
      "courseId": "MA01 線形代数 I", // 重要: 入力された id_name と一言一句完全に同じ文字列を返すこと
      "courseName": "線形代数I",
      "comment": "目標がAIエンジニアなら、これ落としたら話にならないぞ。気合入れていけ。"
    }
  ]
}
`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
        }
    });

    if (!response.text) {
        throw new Error('No response from AI');
    }

    return JSON.parse(response.text) as ConsultationResponse;
};

export const generateTimetablePatterns = async (
    courses: CourseData[]
): Promise<TimetablePatternsResponse> => {
    if (!GEMINI_API_KEY) {
        throw new Error('API Key is missing. Please set VITE_GEMINI_API_KEY in your .env file.');
    }

    // Map each course to its available classes
    const courseClassMap = courses.map(course => {
        return {
            courseId: course.id_name,
            courseTitle: course.id_name,
            availableClasses: course.classes.map(c => ({
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
- **必ず日本語で回答すること**。
- **「作成不可能」という回答は禁止。** 多少のコマの重なり（重複）が発生しても構わないので、必ず5つのパターンを提案すること。
- 重複がある場合は、その旨を 'description' に記載すること。
- **会津大学のクラス制への対応**: 1-2年生は「C1〜C6」、3-4年生は「CS, IT-SPR, SY, CN, IT-CMV, SE-DE」というクラス（コース）ごとに授業が重ならないよう設計されています。
- **時間割作成の戦略**: 各パターンを作成する際、まずベースとなる【基準クラス（例: C1）】を1つ決め、そのクラス名が含まれる授業を最優先で選択してください。これにより、物理的なコマの重なりを最小限に抑えた現実的な時間割を作成すること。

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
      "description": "パターンの解説（日本語）",
      "assignments": [
        { "courseId": "MA01", "classId": "C1" }
      ]
    }
  ]
}
`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
        }
    });

    if (!response.text) {
        throw new Error('No response from AI');
    }

    return JSON.parse(response.text) as TimetablePatternsResponse;
};
