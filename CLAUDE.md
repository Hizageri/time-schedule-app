# CLAUDE.md

会津大学生向けの AI 時間割作成アプリ。React + TypeScript + Vite / Firebase（Auth・Firestore）/ Vercel Functions + Gemini。

## 開発の進め方（cc-sdd）

- このプロジェクトは spec 駆動で開発する。**実装の前に必ず `specs/` を読むこと**
  - `specs/01_requirements.md`：要件定義（画面・機能・業務ルール）
  - `specs/02_architecture.md`：技術選定（構成・データの流れ・API・外部サービス設定）
  - `specs/03_schema.md`：型定義の案（正はここ）
  - `specs/04_tasks.md`：実装の順番（タスク）と、付録に既知の課題一覧
- `specs/` に書かれていない仕様を勝手に追加しない。必要なら先に spec の変更を提案する
- 1回の依頼では1タスクだけ進める。着手前に修正方針を説明し、了承を得てから実装する
- タスクが終わったら `04_tasks.md` にチェックを入れ、関連する spec も更新する

## 型のルール

- データ構造を変えるときは、`specs/03_schema.md` を先に更新してから `src/types/` に反映する
- `src/types/` だけを直接変えない（spec にない UI 専用の型は例外）
- `src/` から `specs/` を import しない
- 新しいコードで `any` を使わない

## ディレクトリのルール（移行先）

- `components/`：汎用UI / `pages/`：画面 / `hooks/`：ロジック / `context/`：グローバル状態
- `utils/`：UIを持たない純粋関数 / `lib/`：外部ライブラリの初期化（firebase など）
- `types/`：型 / `data/`：固定JSON / `assets/`：静的素材
- コンポーネントから `firebase/*` を直接 import しない（`lib/` と `hooks/` を経由する）

## セキュリティ

- APIキーや秘密情報をコードや commit に含めない。`.env` は絶対に commit しない
- Gemini は必ず `api/`（サーバー側）から呼ぶ。`VITE_` から始まる変数に秘密情報を入れない

## コマンド

- `npm run dev`：開発サーバー（`/api` も動く）
- `npm run build`：型チェック＋ビルド
- `npm run lint`：ESLint
- `npm run build:reviews`：口コミJSONの再生成
