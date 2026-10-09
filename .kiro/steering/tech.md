# Technology Steering

> updated_at: 2026-10-08（旧 `specs/` への参照をなくし、steering だけで読めるようにした）
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
| テスト | なし |

## アーキテクチャ

```
ブラウザ（React）
 ├─ Firebase Auth ……… Google ログイン
 ├─ Firestore ………… users/{uid} に AppState を丸ごと保存
 └─ fetch /api/* ─▶ Vercel Functions ─▶ Gemini API

シラバス・口コミ ……… src/data/*.json をビルド時にバンドル（DB には入れない）
```

- **グローバル状態**：`AppContext` の `AppState` 1つ。画面は `useAppContext()` で読み書きする
- **永続化**：ログイン時に `users/{uid}` を読み `defaultState` とマージ。以後、状態が変わるたびに `setDoc(..., state, { merge: true })` で状態全体を書く
- **マスターデータ**：`src/data.ts` が `syllabus.json` に `reviews_bit.json`・`reviews_text.json` を結合して `MOCK_COURSES` を作る
- **AI 呼び出し**：画面 → `src/ai/aiService.ts` → `POST /api/*` → Gemini。ブラウザから Gemini を直接呼ばない

## API（`api/*.ts`）の共通パターン

- `export default async function handler(req, res)`。POST 以外は 405
- `process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY` を使う。ない場合は 500
- 日本語プロンプト（キャラ設定・出力形式・文字数）と英語の `systemInstruction`（JSON のみを返す指示）
- 返答は文字列からコードフェンスを除き、`{...}` を抜き出し、末尾カンマを除いて `JSON.parse`（構造化出力は使っていない）
- Gemini の呼び出しは `api/_lib/geminiRetry.ts` の `withGeminiRetry` で包む。503・429 のときだけ 1秒→2秒→4秒 待って最大3回再試行する（呼び出し開始から45秒を超える再試行はしない）。400・APIキーのエラー・JSON 解析の失敗は再試行しない
- 再試行しても混雑が続いたら、軽量モデル（`FALLBACK_MODEL` = `gemini-3.1-flash-lite`）で1回だけ試す（開始から40秒を過ぎていたら試さない）。モデル名は `api/_lib/geminiRetry.ts` の `PRIMARY_MODEL`・`FALLBACK_MODEL` で一元管理する
- `vercel.json` で `api/*.ts` の `maxDuration` を 60 秒にしている
- 失敗時は 200 で定型の代替レスポンスを返す（`chatbot` だけは 500）。文面はコマどり先輩の口調で、混雑（503・429）とそれ以外で `getGeminiErrorMessage` が切り替える
- `api/_lib/` を import するときは `.js` 拡張子を付ける（`"type": "module"` のため）
- 認証なし（誰でも呼べる。Firebase ID トークンの検証を今後 spec で対応予定）
- `consultation`・`chatbot` は `src/data/*.json` を `fs` で読む（`process.cwd()` と `__dirname` 基準の複数パスを試す）

| エンドポイント | リクエスト | 使う画面 |
|---------------|-----------|----------|
| `/api/consultation` | `{ userProfile, courses }` | 4 |
| `/api/timetable-patterns` | `{ courses, baseClass }` | 5 |
| `/api/grade-reaction` | `{ userProfile, grades }` | 7 |
| `/api/chatbot` | `{ message, history }` | なし（未使用） |

## データ表現の要点

- `target_bit`（11ビット）：bit0-5 学年 / bit6-7 クォーター（奇数・偶数・またぎ・集中）/ bit8-9 学期（前期・後期・通年）/ bit10 再履修
- 科目単位の `target_bit` がなければクラス単位の `target_bit` を見る（`course.target_bit ?? course.classes[0]?.target_bit`）
- `reviews_bit`（12ビット）：難易度・課題量・テスト・出席を各3ビット
- コマ文字列は `"月-1"` 形式（最大 11 限）。集中講義には `"TBD"` や `"8/24(月)"` のような日付文字列も入る
- 型の正は `data-model.md`。現在のコード上の型は `src/logic/types.ts`

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
```

- 開発時は `vite.config.ts` の `local-api-handler` が `/api/<name>` を `api/<name>.ts` に振り分け、Vercel の `req.body` / `res.status().json()` を真似る

## 技術上の決まり（守ること）

- 秘密情報をコード・commit に入れない。Gemini は必ず `api/` から呼ぶ
- 新しいコードで `any` を使わない（既存コードには多数残っている）
- 型を変えるときは `data-model.md` を先に直す
- `src/` からドキュメント（Markdown）を import しない
- モデル名・SDK の変更（`@google/genai` への移行）は今後 spec で対応予定。個別に変えない

## 既知の技術的な注意点

- 状態全体を変更のたびに Firestore に書く（1文字入力ごと）。`selectedCourses` にシラバス本文ごと入る
- `merge: true` のため、Map のキーを消しても Firestore 側に残る可能性がある
- ログイン直後、読み込み前に初期状態が書き込まれる可能性がある
- Error Boundary がなく、例外で画面が真っ白になる（例：`OT03-001` の詳細モーダルを開いたとき）
- `src/ui/styles/index.css` に Tailwind v4 の `@theme` 構文があるが、使っているのは v3。色の正は `tailwind.config.js`
- デバッグ用 `console.log` が残っている（`firebase.ts` の API キー先頭6文字のログを含む）
