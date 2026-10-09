import { GoogleGenerativeAIFetchError } from "@google/generative-ai";

// api/ の共通処理（"_" で始まるため Vercel のエンドポイントにはならない）

// Gemini が混雑しているとき（503・429）のコマどり先輩の返答
export const BUSY_MESSAGE = "今は相談が殺到してて手が回らねえ。少し待ってからもう一回来い";
// それ以外のエラーのときのコマどり先輩の返答
export const GENERAL_ERROR_MESSAGE = "なんか調子が悪いみてえだ。時間をおいて出直してこい";

const RETRYABLE_STATUSES = [503, 429];
// 再試行前の待ち時間（ミリ秒）。要素数 = 最大再試行回数
const RETRY_DELAYS_MS = [1000, 2000, 4000];
// 呼び出し開始からの時間予算。vercel.json の maxDuration（60秒）より短くする
const TIME_BUDGET_MS = 45_000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const isGeminiBusyError = (error: unknown): boolean =>
    error instanceof GoogleGenerativeAIFetchError &&
    error.status !== undefined &&
    RETRYABLE_STATUSES.includes(error.status);

export const getGeminiErrorMessage = (error: unknown): string =>
    isGeminiBusyError(error) ? BUSY_MESSAGE : GENERAL_ERROR_MESSAGE;

// Gemini 呼び出しを包み、503・429 のときだけ待ってから再試行する
export async function withGeminiRetry<T>(call: () => Promise<T>): Promise<T> {
    const startedAt = Date.now();

    for (let attempt = 0; ; attempt++) {
        try {
            return await call();
        } catch (error) {
            const delay = RETRY_DELAYS_MS[attempt];
            const elapsed = Date.now() - startedAt;
            if (!isGeminiBusyError(error) || delay === undefined || elapsed + delay > TIME_BUDGET_MS) {
                throw error;
            }
            const status = error instanceof GoogleGenerativeAIFetchError ? error.status : undefined;
            console.warn(`[Gemini Retry] status ${status}. ${delay}ms 待って再試行します (${attempt + 1}/${RETRY_DELAYS_MS.length})`);
            await sleep(delay);
        }
    }
}
