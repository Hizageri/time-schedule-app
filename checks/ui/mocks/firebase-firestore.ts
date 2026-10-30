// firebase/firestore の偽物（保存データは window.__h.docs、setDoc の呼び出しは window.__h.setDocCalls に記録）
import { h } from '../setup';

export const initializeFirestore = () => ({});
export const doc = (_db: unknown, ...parts: string[]) => ({ path: parts.join('/') });
export const getDoc = async (ref: { path: string }) => {
    if (h.getDocDelayMs) await new Promise(resolve => setTimeout(resolve, h.getDocDelayMs));
    if (h.getDocFail) throw new Error('mock getDoc failure');
    const data = h.docs[ref.path];
    return { exists: () => data !== undefined, data: () => JSON.parse(JSON.stringify(data)) };
};
export const setDoc = (ref: { path: string }, data: unknown, opts?: unknown): Promise<void> => {
    if (h.setDocThrowSync) throw new Error('mock sync setDoc failure');
    if (h.setDocReject) return Promise.reject(new Error('mock async setDoc failure'));
    const copy: unknown = JSON.parse(JSON.stringify(data));
    h.setDocCalls.push({ path: ref.path, data: copy, opts: opts ?? null, t: Date.now() });
    h.docs[ref.path] = copy;
    return Promise.resolve();
};
