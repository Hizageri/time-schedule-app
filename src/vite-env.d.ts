/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_API_KEY: string
  /** 開発サーバーでだけ効く。'test' で試しの大学（src/config/currentUniversity.ts） */
  readonly VITE_UNIVERSITY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
