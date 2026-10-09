import { GoogleGenerativeAIFetchError } from "@google/generative-ai";

// api/ の共通処理（"_" で始まるため Vercel のエンドポイントにはならない）

// Gemini が混雑しているとき（503・429）のコマどり先輩の返答
export const BUSY_MESSAGE = "今は相談が殺到してて手が回らねえ。少し待ってからもう一回来い";
// それ以外のエラーのときのコマどり先輩の返答
export const GENERAL_ERROR_MESSAGE = "なんか調子が悪いみてえだ。時間をおいて出直してこい";

// メインのモデルと、混雑で再試行を使い切ったときに1回だけ試す軽量モデル
export const PRIMARY_MODEL = "gemini-2.5-flash";
export const FALLBACK_MODEL = "gemini-3.1-flash-lite";

const RETRYABLE_STATUSES = [503, 429];
// 再試行前の待ち時間（ミリ秒）。要素数 = 最大再試行回数
const RETRY_DELAYS_MS = [1000, 2000, 4000];
// 呼び出し開始からの時間予算。vercel.json の maxDuration（60秒）より短くする
const TIME_BUDGET_MS = 45_000;
// これを過ぎていたら軽量モデルは試さない（maxDuration までに応答を待つ時間を残す）
const FALLBACK_DEADLINE_MS = 40_000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const isGeminiBusyError = (error: unknown): boolean =>
    error instanceof GoogleGenerativeAIFetchError &&
    error.status !== undefined &&
    RETRYABLE_STATUSES.includes(error.status);

export const getGeminiErrorMessage = (error: unknown): string =>
    isGeminiBusyError(error) ? BUSY_MESSAGE : GENERAL_ERROR_MESSAGE;

// Gemini 呼び出しを包み、503・429 のときだけ待ってから再試行する。
// 再試行しても混雑が続いたら、軽量モデルで1回だけ試す
export async function withGeminiRetry<T>(call: (modelName: string) => Promise<T>): Promise<T> {
    const startedAt = Date.now();
    let lastBusyError: unknown;

    for (let attempt = 0; ; attempt++) {
        try {
            return await call(PRIMARY_MODEL);
        } catch (error) {
            if (!isGeminiBusyError(error)) {
                throw error;
            }
            const delay = RETRY_DELAYS_MS[attempt];
            const elapsed = Date.now() - startedAt;
            if (delay === undefined || elapsed + delay > TIME_BUDGET_MS) {
                lastBusyError = error;
                break;
            }
            const status = error instanceof GoogleGenerativeAIFetchError ? error.status : undefined;
            console.warn(`[Gemini Retry] status ${status}. ${delay}ms 待って再試行します (${attempt + 1}/${RETRY_DELAYS_MS.length})`);
            await sleep(delay);
        }
    }

    if (Date.now() - startedAt > FALLBACK_DEADLINE_MS) {
        throw lastBusyError;
    }
    console.warn(`[Gemini Retry] ${PRIMARY_MODEL} が混雑しているため ${FALLBACK_MODEL} で1回だけ試します`);
    const result = await call(FALLBACK_MODEL);
    console.log(`[Gemini] ${PRIMARY_MODEL} が混雑のため ${FALLBACK_MODEL} で成功しました`);
    return result;
}
