import { createPublicKey, createVerify } from "crypto";

// Firebase ID トークン（Authorization: Bearer <トークン>）の検証。
// Firebase の公式手順「Verify ID tokens using a third-party JWT library」の確認項目を、
// 新しいライブラリを使わずに Node.js の crypto で行う。トークンの取り消しは確かめない

const PUBLIC_KEYS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
// サーバーとトークンの発行元の時刻のずれを、この秒数まで許す
const CLOCK_SKEW_SECONDS = 60;
// Cache-Control に max-age がないときに公開鍵を覚えておく時間
const DEFAULT_KEYS_TTL_MS = 60 * 60 * 1000;
// 知らない鍵 ID のための取り直しは、この間隔に1回まで（でたらめな鍵 ID の依頼で何度も取りに行かないため）
const MIN_FORCED_REFRESH_INTERVAL_MS = 60 * 1000;

export type AuthResult =
    | { ok: true; uid: string }
    | { ok: false; reason: 'missing' | 'malformed' | 'invalid_signature' | 'expired' | 'wrong_project' }
    | { ok: false; reason: 'keys_unavailable' | 'misconfigured' };

interface KeyCache {
    keys: Record<string, string>;
    expiresAt: number;
}

let keyCache: KeyCache | null = null;
let lastForcedRefreshAt = 0;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

function getProjectId(): string | undefined {
    const id = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    return id && id.trim() !== "" ? id.trim() : undefined;
}

function decodeJsonPart(part: string): Record<string, unknown> | null {
    try {
        const parsed: unknown = JSON.parse(Buffer.from(part, "base64url").toString("utf-8"));
        return isRecord(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

/** 公開鍵を取る。forceRefresh なら覚えている鍵を使わずに取り直す。取れなければ null */
async function getPublicKeys(forceRefresh: boolean): Promise<Record<string, string> | null> {
    if (!forceRefresh && keyCache && keyCache.expiresAt > Date.now()) {
        return keyCache.keys;
    }
    if (forceRefresh) lastForcedRefreshAt = Date.now();
    try {
        const response = await fetch(PUBLIC_KEYS_URL);
        if (!response.ok) return null;
        const body: unknown = await response.json();
        if (!isRecord(body)) return null;
        const keys: Record<string, string> = {};
        for (const [kid, pem] of Object.entries(body)) {
            if (typeof pem === "string") keys[kid] = pem;
        }
        const maxAge = /max-age=(\d+)/.exec(response.headers.get("cache-control") ?? "");
        const ttl = maxAge ? Number(maxAge[1]) * 1000 : DEFAULT_KEYS_TTL_MS;
        keyCache = { keys, expiresAt: Date.now() + ttl };
        return keys;
    } catch {
        return null;
    }
}

function verifySignature(signingInput: string, signature: string, pem: string): boolean {
    try {
        const verifier = createVerify("RSA-SHA256");
        verifier.update(signingInput);
        return verifier.verify(createPublicKey(pem), Buffer.from(signature, "base64url"));
    } catch {
        return false;
    }
}

/** Authorization ヘッダーの ID トークンを検証する。例外は投げず、すべて AuthResult で返す */
export async function verifyIdToken(authorizationHeader: string | string[] | undefined): Promise<AuthResult> {
    const header = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;
    if (!header) return { ok: false, reason: 'missing' };

    const match = /^Bearer\s+(\S+)$/.exec(header.trim());
    if (!match) return { ok: false, reason: 'malformed' };
    const parts = match[1].split(".");
    if (parts.length !== 3) return { ok: false, reason: 'malformed' };
    const [encodedHeader, encodedPayload, signature] = parts;

    const jwtHeader = decodeJsonPart(encodedHeader);
    const payload = decodeJsonPart(encodedPayload);
    if (!jwtHeader || !payload) return { ok: false, reason: 'malformed' };
    if (jwtHeader.alg !== "RS256" || typeof jwtHeader.kid !== "string") return { ok: false, reason: 'malformed' };

    const projectId = getProjectId();
    if (!projectId) return { ok: false, reason: 'misconfigured' };

    // 署名：kid の公開鍵で確かめる。kid が見つからなければ1回だけ取り直す（鍵が入れ替わった直後に備える）。
    // 取り直しが間隔の制限にかかったときは、正しい利用者をログアウトさせないよう 401 にせず keys_unavailable（503）にする
    let keys = await getPublicKeys(false);
    if (keys && !(jwtHeader.kid in keys)) {
        if (Date.now() - lastForcedRefreshAt < MIN_FORCED_REFRESH_INTERVAL_MS) return { ok: false, reason: 'keys_unavailable' };
        keys = await getPublicKeys(true);
    }
    if (!keys) return { ok: false, reason: 'keys_unavailable' };
    const pem = keys[jwtHeader.kid];
    if (!pem || !verifySignature(`${encodedHeader}.${encodedPayload}`, signature, pem)) {
        return { ok: false, reason: 'invalid_signature' };
    }

    // 中身：期限・発行時刻・認証時刻・プロジェクト・利用者
    const now = Math.floor(Date.now() / 1000);
    const { exp, iat, auth_time: authTime, aud, iss, sub } = payload;
    if (typeof exp !== "number" || typeof iat !== "number" || typeof authTime !== "number") {
        return { ok: false, reason: 'malformed' };
    }
    if (exp <= now - CLOCK_SKEW_SECONDS) return { ok: false, reason: 'expired' };
    if (iat > now + CLOCK_SKEW_SECONDS || authTime > now + CLOCK_SKEW_SECONDS) return { ok: false, reason: 'malformed' };
    if (aud !== projectId || iss !== `https://securetoken.google.com/${projectId}`) {
        return { ok: false, reason: 'wrong_project' };
    }
    if (typeof sub !== "string" || sub === "" || sub.length > 128) return { ok: false, reason: 'malformed' };

    return { ok: true, uid: sub };
}

/** 認証に失敗したときの応答（401：トークンの問題、503：公開鍵が取れない、500：設定の問題） */
export function authFailureResponse(
    reason: Extract<AuthResult, { ok: false }>['reason']
): { status: 401 | 500 | 503; code: 'unauthenticated' | 'server_misconfigured' | 'auth_unavailable' } {
    if (reason === 'keys_unavailable') return { status: 503, code: 'auth_unavailable' };
    if (reason === 'misconfigured') return { status: 500, code: 'server_misconfigured' };
    return { status: 401, code: 'unauthenticated' };
}
