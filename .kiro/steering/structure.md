# Structure Steering

> 2026-10-08 時点のコードから作成。現状の構成と、`CLAUDE.md`・`specs/02_architecture.md` にある移行先の構成を併記する。

## 現状のディレクトリ構成

```
api/                       Vercel Functions（Gemini 呼び出し。1ファイル＝1エンドポイント）
  consultation.ts          科目選びの講評
  timetable-patterns.ts    時間割5パターン生成
  grade-reaction.ts        成績へのリアクション
  chatbot.ts               AI先輩チャット（未使用）
scripts/
  build_reviews.js         口コミ JSON とプロンプト用科目一覧の再生成
specs/                     要件・アーキテクチャ・スキーマ・タスク（cc-sdd）
src/
  main.tsx                 エントリ。index.css を読み込み App を描画
  data.ts                  JSON を結合して MOCK_COURSES を作る
  ai/aiService.ts          /api/* を呼ぶクライアント関数とレスポンス型
  components/
    App.tsx                AppProvider・認証ゲート・画面切替（ScreenManager）
    CourseDetailModal.tsx  科目詳細モーダル
    MobileTimetableList.tsx
    LoadingSenpai.tsx      AI 待ちのローディング
  data/                    syllabus.json / raw_reviews.json / reviews_bit.json / reviews_text.json / course_list_for_prompt.md
  lib/firebase.ts          Firebase 初期化（auth, db, googleProvider を export）
  logic/
    AppContext.tsx         グローバル状態・更新関数・Firestore 同期
    types.ts               型・defaultState・未使用のビット計算関数
    utils.ts               cn()、科目コード→色（getSubjectColor）、未使用の重なり判定
    timetableGenerator.ts  ビットの判定・ラベル化・絞り込み（filterByBit 等）、未使用のモック生成
  pages/                   画面（*Screen.tsx）
  ui/
    Header.tsx, Button.tsx 汎用 UI
    styles/                index.css（Tailwind）、App.css
```

### 画面ファイルと `currentScreen`

| # | ファイル | | # | ファイル |
|---|----------|-|---|----------|
| – | `LoginScreen.tsx` | | 5 | `GeneratorScreen.tsx` |
| 1 | `OnboardingScreen.tsx` | | 6 | `DashboardScreen.tsx` |
| 2 | `ConditionScreen.tsx` | | 7 | `GradeInputScreen.tsx` |
| 3 | `CourseSelectionScreen.tsx` | | 8 | `ReflectionScreen.tsx`（遷移元なし） |
| 4 | `ProposalScreen.tsx` | | | |

画面を追加するときは `AppState['currentScreen']` の型、`ScreenManager` の `switch`、遷移元の `setScreen()` をそろえて変える。

## 移行先の構成（`specs/04_tasks.md` フェーズ5で実施）

| 現状 | 移行先 |
|------|--------|
| `logic/types.ts` | `types/` |
| `logic/AppContext.tsx` | `context/`（Firestore 処理は `hooks/` へ） |
| `logic/utils.ts`、`logic/timetableGenerator.ts` のビット判定 | `utils/` |
| `ai/aiService.ts` | `lib/` |
| `ui/*`、`components/*` | `components/` |
| `components/App.tsx` | `src/App.tsx` |
| `ui/styles/` | `assets/` |

- 移行先の役割：`components/` 汎用 UI / `pages/` 画面 / `hooks/` ロジック / `context/` グローバル状態 / `utils/` UI のない純粋関数 / `lib/` 外部ライブラリの初期化 / `types/` 型 / `data/` 固定 JSON / `assets/` 静的素材
- **移行はタスク単位でまとめて行う。** それ以外の作業で新しいファイルを置くときは、現状の構成の同じ役割の場所に置く（例：新しい画面は `pages/`、ビット判定は `logic/timetableGenerator.ts`）

## 依存の向き

```
pages/ ─▶ logic/AppContext（useAppContext）
       ─▶ logic/timetableGenerator, logic/utils
       ─▶ ai/aiService ─▶ /api/*
       ─▶ data.ts（MOCK_COURSES）
       ─▶ components/, ui/
logic/AppContext ─▶ lib/firebase, firebase/*
```

- 画面・コンポーネントから `firebase/*` を直接 import しない（現状は `AppContext` だけが使う。この形を保つ）
- `api/` は `src/` のコードを import しない。データが必要なら `src/data/*.json` を `fs` で読む

## 命名とコードの書き方（既存コードの慣習）

- コンポーネント：PascalCase の名前付き export、`React.FC` で型付け（例：`export const DashboardScreen: React.FC = () => ...`）。`App` だけ default export
- 画面ファイルは `<名前>Screen.tsx`
- 型 import は `import type`（`verbatimModuleSyntax` が有効）
- マスターデータのキーは snake_case（`id_name`, `target_bit`, `class_id`）、アプリ側の状態は camelCase（`courseId`, `targetBit`, `classId`）
- 科目の識別子は `id_name`（"HS01 哲学" のような「コード 名前」）。表示名も兼ねている
- スタイルは Tailwind のユーティリティクラスを直接書く。色は `tailwind.config.js` のトークン（`background` / `foreground` / `card` / `accent` / `border` / `muted`）を使う。共通ボタンは `btn-primary` / `btn-secondary` / `btn-ghost`
- UI の文言・コメントは日本語
- インデントは 4 スペースが多いが、2 スペースのファイルもある（`App.tsx`、`GradeInputScreen.tsx`、`ui/*`）。編集するファイルの書き方に合わせる

## データファイルの扱い

- `reviews_bit.json`・`reviews_text.json`・`course_list_for_prompt.md` は生成物。直接編集せず、`raw_reviews.json` を直して `npm run build:reviews`
- `syllabus.json`（204科目）は手で管理されている。形の崩れたデータ（`OT03-001` の `classes`）があるので、読む側は `schedule` がない可能性を考える
