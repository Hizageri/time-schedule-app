# 02. アーキテクチャ（現状の書き起こし）

> commit `7bac2ab` 時点のコードから現状をそのまま書き起こしたもの。

## 1. 技術スタック

| 分類 | 使用技術 |
|------|----------|
| フロント | React 19 / TypeScript 5.9 / Vite 8 |
| スタイル | Tailwind CSS 3、clsx + tailwind-merge（`cn()`）、framer-motion、lucide-react |
| 認証 | Firebase Authentication（Googleログイン、`signInWithPopup`） |
| DB | Cloud Firestore（`users/{uid}` の1ドキュメントのみ） |
| AI | Gemini API（`@google/generative-ai`、モデル `gemini-2.5-flash`） |
| サーバー | Vercel Serverless Functions（`api/*.ts`） |
| ルーティング | なし（`state.currentScreen` の数字で画面を切り替え） |

## 2. 全体構成

```
ブラウザ（React）
 ├─ Firebase Auth ……… Googleログイン
 ├─ Firestore ………… users/{uid} に AppState を丸ごと保存
 └─ fetch /api/* ─▶ Vercel Functions ─▶ Gemini API
                      （APIキーはサーバー側の環境変数 GOOGLE_API_KEY）

シラバス・口コミ ……… src/data/*.json をビルド時にバンドル（DBには入れていない）
```

- 開発時は `vite.config.ts` 内の自作ミドルウェアが `/api/*` を `api/*.ts` に振り分けて、Vercel の動きを真似ている

## 3. ディレクトリ構成（現状）

```
api/                    Vercel Functions（Gemini呼び出し）
  consultation.ts / timetable-patterns.ts / grade-reaction.ts / chatbot.ts
scripts/build_reviews.js  raw_reviews.json → reviews_bit.json / reviews_text.json を生成
src/
  main.tsx
  data.ts               JSONを結合して MOCK_COURSES を作る
  ai/aiService.ts       /api/* を呼ぶクライアント関数とレスポンス型
  components/           App.tsx（画面切替・認証ゲート）、CourseDetailModal、MobileTimetableList、LoadingSenpai
  data/                 syllabus.json（204科目）、raw_reviews.json、reviews_bit.json、reviews_text.json、course_list_for_prompt.md
  lib/firebase.ts       Firebase初期化
  logic/                AppContext.tsx（状態管理と同期）、types.ts、utils.ts、timetableGenerator.ts（ビット判定・絞り込み）
  pages/                画面9つ
  ui/                   Header、Button、styles/
```

### 新しい構成との対応（移行先の案）

| 現状 | 移行先 |
|------|--------|
| `logic/types.ts` | `types/` |
| `logic/AppContext.tsx` | `context/` |
| `logic/utils.ts`、`logic/timetableGenerator.ts` のビット判定 | `utils/` |
| `ai/aiService.ts` | `lib/` または `services/` `[要相談]` |
| `ui/Header.tsx`、`ui/Button.tsx`、`components/*` | `components/` |
| `components/App.tsx` | `src/App.tsx` |
| `ui/styles/` | `assets/` |
| `data.ts` + `data/` | `data/` |

## 4. 状態管理とデータの流れ

- グローバル状態は `AppContext` の `AppState` 1つ（型は 03_schema.md）
- ログイン時：`users/{uid}` を読み込み、`defaultState` とマージ。ドキュメントがなければ初期状態で作る
- 状態が変わるたびに `setDoc(users/{uid}, state, { merge: true })` で**状態全体**を書き込む（入力1文字ごとに書き込みが走る）
- 科目データ（`CourseData`）は `selectedCourses` に**オブジェクトごと**保存されるので、シラバス本文も Firestore に複製される

## 5. Firestore

| パス | 中身 |
|------|------|
| `users/{uid}` | `AppState` 全体（`currentScreen` も含む） |

- セキュリティルールはリポジトリに入っていない → 現状が不明 `[要確認]`

## 6. API（Vercel Functions）

| エンドポイント | リクエスト | レスポンス | 失敗したとき |
|---------------|-----------|-----------|--------------|
| POST `/api/consultation` | `{ userProfile, courses }` | `ConsultationResponse` | 200で定型文を返す |
| POST `/api/timetable-patterns` | `{ courses, baseClass }` | `TimetablePatternsResponse` | 200で中身が空の5パターンを返す |
| POST `/api/grade-reaction` | `{ userProfile, grades }` | `GradeReactionResponse` | 200で「通信エラー」の文面を返す |
| POST `/api/chatbot` | `{ message, history }` | `{ response }` | 500 |

- どのAPIも認証をしていない（誰でも呼べる）
- AIの返答は文字列からJSON部分を取り出してパースしている（構造化出力は使っていない）

## 7. 環境変数

| 変数 | 使う場所 |
|------|----------|
| `GOOGLE_API_KEY`（または `GEMINI_API_KEY`） | `api/*`（サーバー側のみ） |
| `VITE_FIREBASE_*`（6個） | `src/lib/firebase.ts`（ブラウザ側。`vite.config.ts` の `define` でも埋め込んでいる） |

## 8. デプロイと外部サービスの設定

> コードの外（各サービスの管理画面）でしている設定の記録。**キーやパスワードの値は絶対に書かない**（名前と保存場所だけ書く）。

### 8-1. URL

| 種類 | URL | 用途 |
|------|-----|------|
| 本番 | `https://（Vercel の Settings → Domains に表示されるドメイン）` | **利用者にはこれを案内する** |
| デプロイごとの URL | `https://<プロジェクト名>-<ランダム>-yuse1drm-7077s-projects.vercel.app` | デプロイするたびに変わる。確認用。**Google ログインはできない** |
| ローカル | `http://localhost:5173` | `npm run dev` |

### 8-2. Firebase（コンソール → Authentication → 設定 → 承認済みドメイン）

| ドメイン | 理由 |
|----------|------|
| `localhost` | ローカル開発（最初から登録済み） |
| `（本番ドメイン）` | 本番 |

- ワイルドカード（`*.vercel.app`）は登録できない。デプロイごとの URL は登録しない
- 独自ドメインを追加したら、ここにも追加する

### 8-3. 環境変数の保存場所

| 変数 | Vercel | ローカル `.env` | 注意 |
|------|:------:|:---------------:|------|
| `GOOGLE_API_KEY` | ✅ Production / Preview / Development | ✅ | サーバー専用。`VITE_` を付けない |
| `VITE_FIREBASE_*`（6個） | ✅ | ✅ | ブラウザに公開される前提の値 |

- 環境変数を変えたら、Vercel で **Redeploy** しないと反映されない
- `.env` は commit しない（`.gitignore` 済み）。見本は `.env.example` に、値は入れずに書く

### 8-4. キーの更新履歴（値は書かない）

| 日付 | 内容 |
|------|------|
| 2026-10-07 | 履歴に漏れていた Gemini キー3つ（末尾 9fd0 / mgqA / pJBE）を削除し、新しいキーを発行して Vercel に設定 |

### 8-5. よくあるトラブル

| 症状 | 原因 | 対処 |
|------|------|------|
| `auth/unauthorized-domain` でログインできない | 開いている URL が Firebase の承認済みドメインにない（デプロイごとの URL で開いている） | 本番 URL で開く。新しいドメインなら 8-2 に追加 |
| `Database '(default)' not found` | Firebase プロジェクトに Firestore のデータベースがない、または `VITE_FIREBASE_PROJECT_ID` が別のプロジェクトを指している | Firestore で `(default)` データベースを作成する／プロジェクトIDを確認して Redeploy |
| AI 機能が「生成エラー」になる | `GOOGLE_API_KEY` が未設定か無効、または Redeploy していない | 8-3 を確認して Redeploy |

## 9. ビルドと開発

- `npm run dev`：Vite ＋ 自作の `/api` ミドルウェア
- `npm run build`：`tsc -b && vite build`
- `npm run build:reviews`：口コミJSONを再生成
- テストはない
