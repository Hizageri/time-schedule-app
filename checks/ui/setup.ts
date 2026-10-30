// 試しの画面の偽物の Firebase の状態。Playwright からは window.__h で操作する
type AuthCallback = (user: unknown) => void;

export interface MockUser {
    uid: string;
    displayName: string;
    email: string;
    photoURL: null;
    getIdToken: () => Promise<string>;
}

export const h = {
    authCb: null as AuthCallback | null,
    /** 保存データ（key は "users/<uid>"） */
    docs: {} as Record<string, unknown>,
    /** setDoc が呼ばれた記録 */
    setDocCalls: [] as { path: string; data: unknown; opts: unknown; t: number }[],
    getDocFail: false,
    getDocDelayMs: 0,
    setDocThrowSync: false,
    setDocReject: false,
    /** signInWithPopup をこのエラーコードで失敗させる（例：auth/popup-closed-by-user） */
    popupErrorCode: undefined as string | undefined,
    currentUser: null as MockUser | null,
    makeUser(uid: string): MockUser {
        return { uid, displayName: uid, email: uid + '@x', photoURL: null, getIdToken: async () => 'tok-' + uid };
    },
    login(uid: string) {
        this.currentUser = this.makeUser(uid);
        this.authCb?.(this.currentUser);
    },
};

(window as unknown as { __h: typeof h }).__h = h;
