// AI 窓口が使う、リクエスト・レスポンスの最小限の型と、エラー応答の形。
// Vercel の関数と、開発時の vite.config.ts の local-api-handler の両方で使える形にしている

export interface ApiRequest {
    method?: string;
    headers: Record<string, string | string[] | undefined>;
    body?: unknown;
}

export interface ApiResponse {
    status(code: number): ApiResponse;
    json(body: unknown): unknown;
}

export type ApiErrorCode =
    | 'method_not_allowed'   // 405
    | 'invalid_input'        // 400 入力の上限を超える・形が違う・知らない科目 ID
    | 'unauthenticated'      // 401 ID トークンがない・無効・期限切れ・別プロジェクト
    | 'chatbot_disabled'     // 410 チャットの窓口（常に）
    | 'server_misconfigured' // 500 API キー・プロジェクト ID がない、シラバスが読めない
    | 'auth_unavailable';    // 503 Google の公開鍵が取れない

/** エラー応答を返す。本文は { error: コード } だけで、詳しい理由は返さない（ログにだけ残す） */
export function sendError(res: ApiResponse, status: number, code: ApiErrorCode): unknown {
    return res.status(status).json({ error: code });
}

/** ヘッダーを1つの文字列として取り出す（Node.js のヘッダー名は小文字） */
export function getHeader(req: ApiRequest, name: string): string | undefined {
    const value = req.headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
}
