# Technology Steering

> updated_at: 2026-10-24（secure-and-stable：AI 窓口の前処理、保存の流れ）
> 2026-10-08 時点のコードから作成。
> 外部サービスの設定（Firebase の承認済みドメイン、Vercel の環境変数、トラブル対応）は `deployment.md`、型定義は `data-model.md` を参照。

## 技術スタック

| 分類 | 使用技術 |
|------|----------|
| フロント | React 19 / TypeScript 5.9（`strict`）/ Vite 8 |
| スタイル | Tailwind CSS 3、`cn()`（clsx + tailwind-merge）、framer-motion、lucide-react |
| 認証 | Firebase Authentication（Google、`signInWithPopup`） |
| DB | Cloud Firestore（`users/{uid}` の1ドキュメントのみ） |
| AI | Gemini API（`@google/generative-ai`、モデル `gemini-2.5-flash`、混雑時の予備 `gemini-3.1-flash-lite`） |
| サーバー | Vercel Serverless Functions（`api/*.ts`） |
| ルーティング | なし（`state.currentScreen` の数字 1〜8 で画面を切り替え） |
| テスト | 試しの画面（`checks/ui/`。Firebase と AI 窓口を偽物にして本物の画面を Playwright で動かす）。単体テストの仕組みはない |

## アーキテクチャ

```
ブラウザ（React）
 ├─ Firebase Auth ……… Google ログイン
 ├─ Firestore ………… users/{uid} に AppState を丸ごと保存
 └─ fetch /api/* ─▶ Vercel Functions ─▶ Gemini API

シラバス・口コミ ……… src/data/*.json をビルド時にバンドル（DB には入れない）
```

- **グローバル状態**：`AppContext` の `AppState` 1つ。画面は `useAppContext()` で読み書きする
- **永続化**：ログイン時に `users/{uid}` を読み `defaultState` に重ねる（なければ `defaultState` で作る）。読み込みの状態（`loadStatus`：`signedOut`・`loading`・`ready`・`error`）が `ready` のときだけ保存する。保存は最後の変更から 3 秒後（`SAVE_DEBOUNCE_MS`）に1回、`setDoc(..., state)` を `merge` なしで書く。ページが隠れる・閉じられる・ログアウトの前・利用者が切り替わる前は、待っている保存をすぐ行う（予約した時点の利用者の分として書く）。読み込みに失敗したら保存せず、再読み込みの画面を出す
- **マスターデータ**：`src/data.ts` が `syllabus.json` に `reviews_bit.json`・`reviews_text.json` を結合して `MOCK_COURSES` を作る
- **AI 呼び出し**：画面 → `src/ai/aiService.ts`（`postToApi` が Firebase の ID トークンを `Authorization` に付ける。401 ならログアウトしてログイン画面へ、それ以外の失敗はコマどり先輩の口調の文面）→ `POST /api/*` → Gemini。ブラウザから Gemini を直接呼ばない

## API（`api/*.ts`）の共通パターン

- `export default async function handler(req: ApiRequest, res: ApiResponse)`（型は `api/_lib/http.ts`）
- **前処理の順番**：メソッド（POST 以外は 405）→ 認証（`api/_lib/auth.ts` の `verifyIdToken`。`Authorization: Bearer <Firebase ID トークン>` がない・無効なら 401、Google の公開鍵が取れなければ 503）→ 入力の確認（`api/_lib/validation.ts`。上限を超える・形が違う・知らない科目 ID なら 400）→ API キー（`process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY`。ない場合は 500）。前処理で断るときは Gemini を呼ばない
- 前処理で断るときの応答は `{ error: コード }`（`sendError`）だけ。理由の詳細はトークンや入力の中身を出さずに `console.warn` でログに残す
- AI に渡す科目の中身（概要・単位・クラスとコマ・口コミ本文）は、送られた科目 ID からサーバーのシラバス（`api/_lib/syllabus.ts`）で引く。送られた文章は使わない。シラバスを読めなければ 500
- 日本語プロンプト（キャラ設定・出力形式・文字数）と英語の `systemInstruction`（JSON のみを返す指示）
- 返答は文字列からコードフェンスを除き、`{...}` を抜き出し、末尾カンマを除いて `JSON.parse`（構造化出力は使っていない）
- Gemini の呼び出しは `api/_lib/geminiRetry.ts` の `withGeminiRetry` で包む。503・429 のときだけ 1秒→2秒→4秒 待って最大3回再試行する（呼び出し開始から45秒を超える再試行はしない）。400・APIキーのエラー・JSON 解析の失敗は再試行しない
- 再試行しても混雑が続いたら、軽量モデル（`FALLBACK_MODEL` = `gemini-3.1-flash-lite`）で1回だけ試す（開始から40秒を過ぎていたら試さない）。メインのモデルが 404（見つからない・提供終了）を返したときは、再試行せずにすぐ予備モデルで1回だけ試す。モデル名は `api/_lib/geminiRetry.ts` の `PRIMARY_MODEL`・`FALLBACK_MODEL` で一元管理する
- `vercel.json` で `api/*.ts` の `maxDuration` を 60 秒にし、`includeFiles: "src/data/**"` でシラバスと口コミの JSON を関数に同梱している（`api/_lib/syllabus.ts` が `fs` で読むため。ファイル名が変数だと自動で同梱されない可能性がある）
- Gemini の失敗時は 200 で定型の代替レスポンスを返す。文面はコマどり先輩の口調で、混雑（503・429）とそれ以外で `getGeminiErrorMessage` が切り替える
- `api/_lib/` を import するときは `.js` 拡張子を付ける（`"type": "module"` のため）
- `chatbot` は止めている（2026-10-24）。どんな依頼にも 410 `chatbot_disabled` を返す（コードは残している）
- `src/data/*.json` は `api/_lib/syllabus.ts` が `fs` で読む（`process.cwd()` と `__dirname` 基準の複数パスを試す。`chatbot` の中にも古い読み込みが残っている）

| エンドポイント | リクエスト | 使う画面 |
|---------------|-----------|----------|
| `/api/consultation` | `{ userProfile, courses }` | 4 |
| `/api/timetable-patterns` | `{ courses, baseClass, pinnedClasses }` | 5 |
| `/api/grade-reaction` | `{ userProfile, grades }` | 7 |
| `/api/chatbot` | `{ message, history }` | なし（止めている。常に 410） |

## データ表現の要点

- `target_bit`（11ビット）：bit0-5 学年 / bit6-7 クォーター（奇数・偶数・またぎ・集中）/ bit8-9 学期（前期・後期・通年）/ bit10 再履修
- 科目単位の `target_bit` がなければクラス単位の `target_bit` を見る（`course.target_bit ?? course.classes[0]?.target_bit`）
- `reviews_bit`（12ビット）：難易度・課題量・テスト・出席を各3ビット
- コマ文字列は `"月-1"` 形式（最大 11 限）。集中講義には `"TBD"` や `"8/24(月)"` のような日付文字列も入る
- 型の正は `data-model.md`。現在のコード上の型は `src/types/index.ts`、初期値は `src/context/defaultState.ts`

## 環境変数

| 変数 | 使う場所 | 注意 |
|------|----------|------|
| `GOOGLE_API_KEY`（または `GEMINI_API_KEY`） | `api/*` | サーバー専用。`VITE_` を付けない |
| `VITE_FIREBASE_*`（6個） | `src/lib/firebase.ts` | ブラウザに公開される前提の値。`vite.config.ts` の `define` でも埋め込む |

- 見本は `.env.example`。`.env` は commit しない
- 保存場所と Redeploy の注意は `deployment.md` を参照

## 開発コマンド

```bash
npm run dev            # Vite + 自作ミドルウェアで /api/* も動く（http://localhost:5173）
npm run build          # tsc -b && vite build（型チェックを兼ねる）
npm run lint           # ESLint（typescript-eslint, react-hooks, react-refresh）
npm run build:reviews  # raw_reviews.json → reviews_bit.json / reviews_text.json / course_list_for_prompt.md
npm run check:ui       # 試しの画面ですべての確認を流す（-- --only <名前の一部> で一部だけ）
```

### 試しの画面（`checks/ui/`、2026-10-30〜）

- 何を確かめるか：本物の画面（`src/main.tsx` から）を開き、Firebase（ログイン・保存データ）と AI 窓口（`/api/*`）を偽物に差し替えて、保存・AI の呼び出し・ピン・最大時限・科目の上限・入学と卒業予定年月・ログインなどの動きと、画面の HTML が基準（`checks/ui/snapshots/`）と同じかを確かめる
- 本物の Firebase・Gemini・本番の URL には接続しない（`localhost` 以外への通信は止める）。`.env` も読まない。本番のビルドには入らない（`src/` の外にある）
- 最初に1回だけ、Playwright のブラウザを入れる：`npx playwright install chromium`
- 確認の追加：`checks/ui/scenarios/` に `*.mjs` を足す（`run.mjs` の `open`・`flush`・`ok` を使う）
- 画面の HTML の基準の作り直し：`npm run check:ui -- --update-snapshots`（見た目を変える spec で、変えたことを確かめてから使う）

- 開発時は `vite.config.ts` の `local-api-handler` が `/api/<name>` を `api/<name>.ts` に振り分け、Vercel の `req.body` / `res.status().json()` を真似る

## 技術上の決まり（守ること）

- 秘密情報をコード・commit に入れない。Gemini は必ず `api/` から呼ぶ
- 新しいコードで `any` を使わない（既存コードには多数残っている）
- 型を変えるときは `data-model.md` を先に直す
- `src/` からドキュメント（Markdown）を import しない
- モデル名・SDK の変更（`@google/genai` への移行）は今後 spec で対応予定。個別に変えない
- PHP は使わない。サーバー側の処理は `api/*.ts`（Vercel の Node.js 関数）で書く（2026-10-22 決定）
- 依存パッケージの脆弱性は `npm audit fix`（`--force` は使わない）で直す。`package.json` の `overrides` で `@grpc/grpc-js` を `^1.13.6` にそろえている。`@firebase/firestore` が `~1.9.0` に固定していて `npm audit fix` だけでは直らないため。ブラウザ用のビルド（`dist/`）と `api/` では grpc を使っていない（2026-10-24）。`firebase` を上げたときは、この指定が要るかを見直す

## 既知の技術的な注意点

- 保存は状態全体を `merge` なしで書く。`selectedCourses` にシラバス本文ごと入る（第2段階で ID だけにする予定）
- 保存は 3 秒まとめるので、ページが強制終了したときは最後の 3 秒の変更が失われることがある。保存に失敗しても画面は止めず、`console.error` に記録するだけ
- AI 窓口の 401 でログアウトさせたとき（`signOutCurrentUser`）は、ログアウトの後に待っている保存を書くので断られることがある（画面のログアウトボタンは先に保存を待つ）
- 同じ利用者の複数のタブは、後から保存したほうが勝つ
- 描画中の例外は `ErrorBoundary`（`src/components/ErrorBoundary.tsx`）が受け止めてエラー画面を出す。ただしイベントハンドラや非同期処理の中の例外は受け止めないので、そこは各処理で `try/catch` する
- `src/ui/styles/index.css` に Tailwind v4 の `@theme` 構文があるが、使っているのは v3。色の正は `tailwind.config.js`

## 役割分担の原則
・答えが決まる計算（絞り込み、集計、コマの重なり、時間割の組み合わせ）はコードでやる
・文章が必要なこと（アドバイス）だけ AI に任せる