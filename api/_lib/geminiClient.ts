// Gemini を1回呼んで、返答の JSON の文字列を返す部品。SDK（@google/genai）を直接触るのはここだけ
// やり直しと予備のモデルへの切りかえは geminiRetry.ts の withGeminiRetry に任せる
import { GoogleGenAI } from "@google/genai";

export interface GenerateJsonParams {
    apiKey: string;
    model: string;
    systemInstruction: string;
    prompt: string;
    /** 返させる JSON の形（JSON Schema。responseSchemas.ts） */
    responseSchema: Record<string, unknown>;
}

/** モデルを1回呼び、JSON の文字列を返す。失敗は SDK のエラーをそのまま投げる */
export async function generateJson(params: GenerateJsonParams): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: params.apiKey });
    const interaction = await ai.interactions.create(
        {
            model: params.model,
            input: params.prompt,
            system_instruction: params.systemInstruction,
            // 利用者のプロフィールや成績を Google 側に残さない（既定では保存される）
            store: false,
            response_format: { type: "text", mime_type: "application/json", schema: params.responseSchema },
        },
        // SDK 自身のやり直しを切る（既定では 503 で何回も送り、withGeminiRetry の時間の予算を超える）
        { retries: { strategy: "none" } },
    );
    const text = interaction.output_text;
    if (!text) {
        throw new Error("Gemini の返答に文章がない");
    }
    return text;
}

export interface ChatTurn {
    role: "user" | "model";
    text: string;
}

export interface GenerateTextParams {
    apiKey: string;
    model: string;
    systemInstruction: string;
    /** これまでの会話と、最後に利用者の新しい発言（最後は必ず "user"） */
    turns: ChatTurn[];
}

/** 会話を送ってモデルを1回呼び、返答の文章を返す（チャットの窓口用。今は止めている） */
export async function generateText(params: GenerateTextParams): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: params.apiKey });
    const interaction = await ai.interactions.create(
        {
            model: params.model,
            input: params.turns.map(turn => ({
                type: turn.role === "user" ? "user_input" as const : "model_output" as const,
                content: [{ type: "text" as const, text: turn.text }],
            })),
            system_instruction: params.systemInstruction,
            store: false,
        },
        { retries: { strategy: "none" } },
    );
    const text = interaction.output_text;
    if (!text) {
        throw new Error("Gemini の返答に文章がない");
    }
    return text;
}
