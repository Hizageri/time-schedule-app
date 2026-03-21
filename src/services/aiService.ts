import { GoogleGenerativeAI } from "@google/generative-ai";
import type { CourseData, AppState } from '../types';

// Use standard Vite env variable for the API key
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

// Safety Guard: Validate API key existence
if (!GOOGLE_API_KEY) {
    console.error('CRITICAL: VITE_GOOGLE_API_KEY is missing. Please set it in your .env file.');
    throw new Error('API Key is missing. Please set VITE_GOOGLE_API_KEY in your .env file.');
}

// Initialize the SDK with proper error handling
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

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

export interface GradeInput {
    courseId: string;
    courseName: string;
    grade: string;
    credits: number;
}

export const generateConsultation = async (
    userProfile: AppState['userProfile'],
    courses: CourseData[]
): Promise<ConsultationResponse> => {
    const courseDetails = courses.map(c => `- ${c.id_name}: (${c.credits} credits). Overview: ${c.outline}`).join('\n');

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

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const response = await model.generateContent(prompt);

    if (!response.response.text) {
        throw new Error('No response from AI');
    }

    // Parse response, removing Markdown code blocks if present
    const responseText = response.response.text().replace(/```json|```/g, "").trim();
    return JSON.parse(responseText) as ConsultationResponse;
};

export const generateTimetablePatterns = async (
    courses: CourseData[],
    baseClass: string
): Promise<TimetablePatternsResponse> => {
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

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const response = await model.generateContent(prompt);

    if (!response.response.text) {
        throw new Error('No response from AI');
    }

    // Parse response, removing Markdown code blocks if present
    const responseText = response.response.text().replace(/```json|```/g, "").trim();
    return JSON.parse(responseText) as TimetablePatternsResponse;
};

export const generateGradeReaction = async (
    userProfile: AppState['userProfile'],
    grades: GradeInput[]
): Promise<string> => {
    const enteredGrades = grades.filter(g => g.grade && g.grade.trim() !== '');
    if (enteredGrades.length === 0) return "成績入力してから来いよ！評価不能だ。";

    const gradeDetails = enteredGrades.map(g => `- ${g.courseName}: ${g.grade}`).join('\n');
    const totalPoints = enteredGrades.reduce((sum, g) => {
        const gradePoint = userProfile.gradingScale.find(s => s.label === g.grade)?.point || 0;
        return sum + (gradePoint * g.credits);
    }, 0);
    const totalCredits = enteredGrades.reduce((sum, g) => sum + g.credits, 0);
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

文字列で直接回答せよ。JSONは不要。`;
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const response = await model.generateContent(prompt);
    
    return response.response.text();
};
