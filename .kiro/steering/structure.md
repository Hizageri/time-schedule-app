# Structure Steering

> updated_at: 2026-10-13（目標の構成を決定し、各フォルダのルールと依存の向きを追加）
> 2026-10-08 時点のコードから作成。現状の構成と、移行先の構成を併記する。

## 現状のディレクトリ構成

```
firestore.rules            Firestore のセキュリティルール（本人の users/{uid} だけ読み書きできる）。反映の手順は deployment.md
vercel.json                Vercel の関数の設定（maxDuration、src/data の同梱）
api/                       Vercel Functions（Gemini 呼び出し。1ファイル＝1エンドポイント）
  consultation.ts          科目選びの講評
  timetable-patterns.ts    時間割5パターン生成
  grade-reaction.ts        成績へのリアクション
  chatbot.ts               コマどり先輩チャット（未使用）
  _lib/geminiRetry.ts      Gemini 呼び出しの再試行とエラー文言（"_" 始まりなのでエンドポイントにならない）
  _lib/syllabus.ts         src/data のシラバスと口コミ本文を読み、科目 ID で科目を引く（AI 窓口がプロンプトに使う科目の中身はここから。送られた文章は使わない）
  _lib/http.ts             AI 窓口の最小限のリクエスト・レスポンスの型と、エラー応答（{ error: コード }）の送り方
  _lib/auth.ts             Firebase ID トークン（Authorization: Bearer）の検証。Google の公開鍵をキャッシュする
  _lib/validation.ts       AI 窓口の入力の上限（INPUT_LIMITS。値はここだけで管理）と、窓口ごとの入力の確認。科目はシラバスから引き直す
scripts/
  build_reviews.js         口コミ JSON とプロンプト用科目一覧の再生成
src/
  main.tsx                 エントリ。index.css を読み込み App を描画
  data.ts                  JSON を結合して MOCK_COURSES を作る
  ai/aiService.ts          /api/* を呼ぶクライアント関数とレスポンス型
  components/
    App.tsx                AppProvider・認証ゲート・画面切替（ScreenManager）
    CourseDetailModal.tsx  科目詳細モーダル
    MobileTimetableList.tsx
    LoadingSenpai.tsx      AI 待ちのローディング
    ErrorBoundary.tsx      描画エラー時にコマどり先輩のエラー画面と「戻る」ボタンを出す（App.tsx で画面全体と ScreenManager を囲む）
  data/                    syllabus.json / raw_reviews.json / reviews_bit.json / reviews_text.json / course_list_for_prompt.md
  lib/firebase.ts          Firebase 初期化（auth, db, googleProvider を export）
  logic/
    AppContext.tsx         グローバル状態・更新関数・Firestore 同期
    types.ts               型・defaultState・未使用のビット計算関数
    utils.ts               cn()、科目コード→色（getSubjectColor）、未使用の重なり判定
    timetableGenerator.ts  ビットの判定・ラベル化・絞り込み（filterByBit 等）、未使用のモック生成
    universityConfig.ts    今の大学（会津大学）の、大学ごとに変わる値（最後の時限・最大時限の下限）と、最大時限の選択肢
    inputLimits.ts         ブラウザ側の入力の上限（選べる科目数・プロフィールの文字数）。api/_lib/validation.ts の値と同じにする
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

## 目標の構成（2026-10-13 決定）

今後は次の構成に移行する。**移行そのものは専用の spec のタスクとして行い、それ以外の作業ではファイルを移さない。**

```
src/
  main.tsx        エントリ
  App.tsx         AppProvider・認証ゲート・画面切替
  assets/         画像・アイコン・CSS などの静的素材
  components/     アプリ全体で使う UI 部品
  pages/          画面（*Screen.tsx）
  hooks/          画面の裏側の処理（use〜）
  context/        アプリ全体で共有する状態
  services/       通信（/api/* の呼び出し。将来は DB からの読み込みも）
  utils/          UI も通信もない純粋な関数
  lib/            外部ライブラリの設定と export
  types/          型
  data/           シラバス・口コミの JSON と、その結合
```

### 各フォルダのルール

| フォルダ | 置くもの | してはいけないこと |
|----------|----------|--------------------|
| `assets/` | 画像・アイコン・CSS | コードを置かない |
| `components/` | 複数の画面で使う UI 部品。データは props で受け取る | `services/`・`firebase/*` を直接使わない |
| `pages/` | 画面1つ＝1ファイル（`<名前>Screen.tsx`） | `services/`・`firebase/*` を直接使わない。計算や通信は `hooks/` に出す |
| `hooks/` | 画面の裏側の処理（計算の組み合わせ、通信、状態の操作）。**ファイル名と関数名は `use` で始める**（例：`useCourseFilter.ts` の `useCourseFilter`）。1ファイル1フック | 見た目（JSX）を返さない |
| `context/` | アプリ全体で共有する状態と、その更新関数（`AppContext`・`useAppContext`） | 通信や保存の処理を直接書かない（`hooks/` に出す） |
| `services/` | 通信だけ（例：`aiApi.ts` で `fetch('/api/consultation')`）。戻り値に型を付ける | React を使わない。API キーなどの秘密情報を置かない（Gemini は必ずルートの `api/` から呼ぶ） |
| `utils/` | 同じ入力なら必ず同じ結果を返す関数（ビット判定、GPA 計算、`cn()` など） | React・通信・Firebase を使わない |
| `lib/` | 外部ライブラリをこのアプリ用に設定して export（例：`firebase.ts`） | アプリの処理を書かない |
| `types/` | 型。中身は `data-model.md` と一致させる | 値（`defaultState` など）を置かない |
| `data/` | JSON と、それを結合して科目一覧を作るファイル | 生成物の JSON を直接編集しない |

### 依存の向き

```
pages/・components/（見た目）
   │ 呼ぶ
   ▼
hooks/・context/（裏側の処理・共有する状態）
   │ 呼ぶ
   ▼
services/（通信）・utils/（計算）・lib/（ライブラリ）・data/

types/ はどこからでも import してよい
```

- 上から下へだけ呼ぶ。下から上（例：`utils/` から `hooks/`）は呼ばない
- `firebase/*` を import してよいのは `lib/`・`hooks/`・`context/` だけ
- ルートの `api/` は `src/` のコードを import しない

### 現状からの対応

| 現状 | 移行先 |
|------|--------|
| `components/App.tsx` | `App.tsx` |
| `logic/types.ts` の型 | `types/` |
| `logic/types.ts` の `defaultState` | `context/` |
| `logic/AppContext.tsx` | `context/AppContext.tsx`（Firestore との同期は `hooks/` に分ける） |
| `logic/timetableGenerator.ts` のビット判定・絞り込み | `utils/` |
| `logic/utils.ts` | `utils/` |
| `ai/aiService.ts` | `services/aiApi.ts` |
| `ui/Header.tsx`・`ui/Button.tsx`・`components/*` | `components/` |
| `ui/styles/` | `assets/styles/` |
| `data.ts` | `data/` |

- 未使用のコード（ビット計算関数、モック生成、`/api/chatbot` など）は、移行のついでに消さない。残すか消すかは別に決める（`product.md` の「現状の位置づけ」を参照）
- **移行の spec が終わるまで**は、新しいファイルを現状の構成の同じ役割の場所に置く（例：新しい画面は `pages/`、ビット判定は `logic/timetableGenerator.ts`）

## 依存の向き（現状）

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
- `syllabus.json`（204科目）は手で管理されている。形の崩れていた `OT03-001` の `classes` は 2026-10-12 に直したが、読む側は引き続き `schedule` がない可能性を考える（`?? []`）
