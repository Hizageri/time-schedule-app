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
        console.error('Chatbot Error: API Key is missing.');
        return res.status(500).json({ error: 'API Key is missing. Please set GOOGLE_API_KEY in .env file.' });
    }

    const { message, history } = req.body || {};

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    // Load data dynamically
    const syllabusData = safeLoadJSON("syllabus.json");
    const reviewsBitData = safeLoadJSON("reviews_bit.json");
    const reviewsTextData = safeLoadJSON("reviews_text.json");

    // Fast lookup maps
    const reviewsMap = new Map<string, number>();
    reviewsBitData.forEach((item: any) => {
        if (item.id && item.rb !== undefined) {
            reviewsMap.set(item.id, item.rb);
        }
    });

    const reviewsTextMap = new Map<string, string>();
    reviewsTextData.forEach((item: any) => {
        if (item.id && item.comment) {
            reviewsTextMap.set(item.id, item.comment);
        }
    });

    // Simple RAG: Extract up to 3 relevant courses based on user keywords
    function getRelevantCourses(userMessage: string): any[] {
        const cleanedMessage = userMessage.toLowerCase();
        
        const scored = syllabusData.map((course: any) => {
            let score = 0;
            const idName = (course.id_name || "").toLowerCase();
            const outline = (course.outline || "").toLowerCase();

            if (idName && idName.includes(cleanedMessage)) {
                score += 15;
            }

            const parts = idName.split(/\s+/);
            parts.forEach(part => {
                if (part && cleanedMessage.includes(part)) {
                    score += 8;
                }
            });

            const keywords = [
                "数学", "物理", "英語", "プログラミング", "演習", "レポート", "試験", "哲学", "文学", 
                "芸術", "体育", "楽", "落単", "単位", "線形代数", "微積分", "統計", "アルゴリズム", "教養"
            ];
            keywords.forEach(kw => {
                if (cleanedMessage.includes(kw) && outline.includes(kw)) {
                    score += 3;
                }
            });

            return { course, score };
        });

        return scored
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(item => ({
                ...item.course,
                reviews_bit: reviewsMap.get(item.course.id_name) ?? 0,
                review_comment: reviewsTextMap.get(item.course.id_name) ?? ""
            }));
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        
        const formattedHistory = (history || []).map((msg: any) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        const systemInstruction = `あなたは会津大学（U-Aizu）の学生生活や時間割、授業の口コミや楽単情報について知り尽くした、親しみにくいがなぜか憎めない「AI先輩」だ。
後輩（ユーザー）の様々な相談（おすすめの授業、楽単情報、試験対策、プログラミング学習、サークル、学食、大学生活一般）に対して、
ぶっきらぼうで荒い言葉遣い（「〜だろ」「〜じゃねえか」「会津の冬を舐めるな」「何やってんだ」など）を交えつつ、
中身は非常に親切で実用的なアドバイスを提供しろ。

ユーザーの質問に関連すると思われる授業データを【参考情報】として提供することがある。
そのデータを元に、「この科目はレポート重視だから楽だぞ」や「試験が8割だからしっかり勉強しろ」といった、具体的かつ信憑性の高いアドバイスを先輩の口調で教えてやれ。
提供された参考情報にない科目は、「その科目のデータは手元にない」とぶっきらぼうに言いつつ、一般的な対策を話せ。

【参考情報に含まれる「評価コード」について】
提供される授業データに 【評価コード: 整数値】 が含まれている場合、これは12ビットの数値を表す口コミ評価データだ。
下位ビットから3ビットずつ（0〜7の値、実質1〜5段階）で以下の評価項目を表している：
- Bit 0-2 (0〜2桁目): 難易度（値が大きいほど難易度が高い・単位取得が厳しい）
- Bit 3-5 (3〜5桁目): 課題量（値が大きいほど課題が多い）
- Bit 6-8 (6〜8桁目): テストの厳しさ（値が大きいほどテストが難しい・厳しい）
- Bit 9-11 (9〜11桁目): 出席の厳しさ（値が大きいほど出席チェックが厳しい）

例：評価コード 1674 (二進数 011010001010) ➔ 難易度: 2, 課題: 1, テスト: 2, 出席: 3
この数値をあなた自身でデコードし、「難易度は2で課題は1だから超楽単だぞ。ただ出席は3だからそこそこ見られる」といった、具体的かつ信憑性の高いアドバイスに翻訳してアドバイスに盛り込め。
評価コードが 0 またはデータにない場合は、評価データがないとぶっきらぼうに言え。

【参考情報に含まれる「先輩のリアルな口コミ」について】
提供される授業データに 【先輩のリアルな口コミ: "..."】 が含まれている場合、実際に先輩から寄せられた生の声だ。
その内容を踏まえつつ、会津大の頼れる先輩としてのキャラクターを崩さずに「生の口コミだと〜って言われてるぞ」や「実際受けてたやつも〜って言ってる」など会話に自然に織り交ぜて回答に含めろ。

【ルール】
1. 必ず日本語で回答すること。
2. 返答はぶっきらぼうに聞こえるようにしつつも、具体的な改善策やアドバイスを必ず含めること。
3. 必要に応じてMarkdown（箇条書きなど）を使って分かりやすく伝えること。
4. 会津大学特有のコンテキスト（コンピュータ理工学部のみの単科大学であること、英語教育、演習の多さ、過酷な冬など）に沿った内容にすること。`;

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: systemInstruction
        });

        const chat = model.startChat({
            history: formattedHistory,
        });

        const relevantCourses = getRelevantCourses(message);
        let finalMessage = message;

        if (relevantCourses.length > 0) {
            const contextData = relevantCourses.map((c: any) => {
                const gradingStr = c.grading 
                    ? `(試験: ${c.grading.exam}%, レポート: ${c.grading.report}%, その他: ${c.grading.others}%)` 
                    : "";
                const reviewsBitStr = c.reviews_bit ? `| 評価コード: ${c.reviews_bit}` : "";
                const reviewCommentStr = c.review_comment ? `\n  【先輩のリアルな口コミ】: "${c.review_comment}"` : "";
                const shortOutline = c.outline ? c.outline.substring(0, 120) : "概要なし";
                return `- 科目名: ${c.id_name} | 単位数: ${c.credits} | 評価割合: ${gradingStr} ${reviewsBitStr}${reviewCommentStr}\n  概要: ${shortOutline}...`;
            }).join('\n');

            finalMessage = `${message}\n\n【参考情報（シラバス部分データ）】\n${contextData}`;
        }

        const result = await chat.sendMessage(finalMessage);
        const responseText = result.response.text();

        return res.status(200).json({ response: responseText });
    } catch (error: any) {
        console.error('Chatbot API Error:', error);
        return res.status(500).json({ error: error.message || 'AI先輩は今忙しいようだ。後でまた話しかけてくれ。' });
    }
}
