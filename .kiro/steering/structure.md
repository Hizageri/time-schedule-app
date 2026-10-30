# Structure Steering

> updated_at: 2026-10-30（src-structure-migration で目標の構成への移行が終わった。現状の構成・依存の向き・画面に残っている計算を書き直した）
> 2026-10-08 時点のコードから作成。

## 現状のディレクトリ構成

```
firestore.rules            Firestore のセキュリティルール（本人の users/{uid} だけ読み書きできる）。反映の手順は deployment.md
vercel.json                Vercel の関数の設定（maxDuration、src/data の同梱）
api/                       Vercel Functions（Gemini 呼び出し。1ファイル＝1エンドポイント）
  consultation.ts          科目選びの講評
  timetable-patterns.ts    時間割5パターン生成
  grade-reaction.ts        成績へのリアクション
  chatbot.ts               コマどり先輩チャット（止めている。どんな依頼にも 410 を返す）
  _lib/geminiRetry.ts      Gemini 呼び出しの再試行とエラー文言（"_" 始まりなのでエンドポイントにならない）
  _lib/syllabus.ts         src/data のシラバスと口コミ本文を読み、科目 ID で科目を引く（AI 窓口がプロンプトに使う科目の中身はここから。送られた文章は使わない）
  _lib/http.ts             AI 窓口の最小限のリクエスト・レスポンスの型と、エラー応答（{ error: コード }）の送り方
  _lib/auth.ts             Firebase ID トークン（Authorization: Bearer）の検証。Google の公開鍵をキャッシュする
  _lib/validation.ts       AI 窓口の入力の上限（INPUT_LIMITS。値はここだけで管理）と、窓口ごとの入力の確認。科目はシラバスから引き直す
scripts/
  build_reviews.js         口コミ JSON とプロンプト用科目一覧の再生成
src/
  main.tsx                 エントリ。assets/styles/index.css を読み込み App を描画
  App.tsx                  AppProvider・認証ゲート（保存データの読み込みに失敗したときの画面を含む）・画面切替（ScreenManager）
  assets/styles/           index.css（Tailwind）、App.css（未使用）
  components/
    Header.tsx, Button.tsx 汎用 UI
    CourseDetailModal.tsx  科目詳細モーダル
    MobileTimetableList.tsx
    LoadingSenpai.tsx      AI 待ちのローディング
    ErrorBoundary.tsx      描画エラー時にコマどり先輩のエラー画面と「戻る」ボタンを出す（App.tsx で画面全体と ScreenManager を囲む）
  pages/                   画面（*Screen.tsx）
  hooks/
    useUserDataSync.ts     保存データの同期：認証の監視・読み込みの状態（loadStatus）・3 秒まとめた保存・すぐ書く保存・ログアウトの前の保存
    useAvailableCourses.ts 画面3：受講できる科目の一覧・選択単位数・上限つきの選択
    useConsultation.ts     画面4：AI 相談の呼び出し・残す科目の選択と確定
    useTimetablePatterns.ts 画面5：パターンの取得（AI と代わりの時間割）・ピンを守る割り当て・手での変更・退避と戻し・プレビューのセル・確定
    useTimetableGrid.ts    画面6：クォーターの切り替え・時間割のセル・集中講義・表示の範囲の外の時限
    useGradeReaction.ts    画面7：成績へのリアクションの AI 呼び出し
  context/
    AppContext.tsx         共有する状態と更新関数（AppProvider・useAppContext）。同期は useUserDataSync に任せる。Google ログイン
    defaultState.ts        状態の初期値
  services/aiApi.ts        /api/* を ID トークン付きで呼ぶクライアント関数とレスポンス型（401 ならログアウト）
  utils/
    targetBit.ts           target_bit の読み取り（学期・クォーター・学年・再履修）とラベル。学期・クォーターの判定はここだけ
    courseFilter.ts        科目の絞り込み（filterByBit・isRetakeCandidate）
    grades.ts              合否の判定（isPassingGradePoint・isCoursePassed・isCourseFailed）
    timetable.ts           ピンを守るクラスの決め方（resolveClassAssignments）、いちばん遅い時限、コマ表のセル探し（findClassesInSlot・findIntensiveEntries）、未使用の重なり判定
    timetableMock.ts       AI が使えないときの代わりの時間割の生成
    studentPeriod.ts       入学・卒業予定年月の確かめと表示（validateStudentPeriod 等）
    subjectColor.ts        科目コード→色（getSubjectColor）
    classNames.ts          cn()
  lib/firebase.ts          Firebase 初期化（auth, db, googleProvider を export）と、ID トークンの取得・ログアウト（getCurrentIdToken・signOutCurrentUser）
  config/
    universityConfig.ts    今の大学（会津大学）の、大学ごとに変わる値（最後の時限・最大時限の下限）と、最大時限の選択肢
    inputLimits.ts         ブラウザ側の入力の上限（選べる科目数・プロフィールの文字数）。api/_lib/validation.ts の値と同じにする
  types/index.ts           型（中身は data-model.md と一致させる）
  data/
    index.ts               JSON を結合して MOCK_COURSES を作る
    *.json, *.md           syllabus.json / raw_reviews.json / reviews_bit.json / reviews_text.json / course_list_for_prompt.md
checks/ui/                 試しの画面（npm run check:ui。使い方は tech.md）
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

## 目標の構成（2026-10-13 決定、2026-10-30 移行済み）

2026-10-30 に src-structure-migration で移行した。新しいファイルはこの構成とルールに従って置く。

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
  config/         大学ごとに変わる値・入力の上限などの設定の値（2026-10-30 追加）
  types/          型
  data/           シラバス・口コミの JSON と、その結合

checks/ui/        試しの画面（src の外。本番のビルドに入らない。2026-10-30 追加）
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
| `config/` | 設定の値と、値から選択肢を作る程度の小さな関数（例：`universityConfig.ts`・`inputLimits.ts`） | React・通信・Firebase を使わない。秘密情報を置かない（ブラウザに送られる） |
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
services/（通信）・utils/（計算）・config/（設定）・lib/（ライブラリ）・data/

types/ はどこからでも import してよい
```

- 上から下へだけ呼ぶ。下から上（例：`utils/` から `hooks/`）は呼ばない
- `firebase/*` を import してよいのは `lib/`・`hooks/`・`context/` だけ
- ルートの `api/` は `src/` のコードを import しない
- `checks/ui/`（試しの画面）は `src/` を読み込んでよい。`src/` は `checks/` を読み込まない

### 移行の記録（2026-10-30 に移し終えた）

| 移行の前 | 移行の後 |
|------|--------|
| `components/App.tsx` | `App.tsx` |
| `logic/types.ts` の型 | `types/index.ts` |
| `logic/types.ts` の `defaultState` | `context/defaultState.ts` |
| `logic/AppContext.tsx` | `context/AppContext.tsx`（Firestore との同期は `hooks/useUserDataSync.ts`） |
| `logic/timetableGenerator.ts`・`logic/utils.ts` | `utils/` の役割ごとのファイル（上の構成を参照） |
| `logic/universityConfig.ts`・`logic/inputLimits.ts` | `config/` |
| `ai/aiService.ts` | `services/aiApi.ts` |
| `ui/Header.tsx`・`ui/Button.tsx` | `components/` |
| `ui/styles/` | `assets/styles/` |
| `data.ts` | `data/index.ts` |
| 各画面の裏側の処理 | `hooks/use〜.ts`（上の構成を参照） |

- 未使用のコード（ビット計算関数、モック生成の一部、`checkScheduleConflict`、`/api/chatbot` など）は、移行のついでに消していない。残すか消すかは別に決める（`product.md` の「現状の位置づけ」を参照）

## 依存の向き（現状）

```
App.tsx ─▶ context/AppContext, pages/, components/ErrorBoundary
pages/ ─▶ context/AppContext（useAppContext）, hooks/use〜
       ─▶ utils/, config/, data/（下の「画面に残っている計算」で使う分）
       ─▶ components/
components/ ─▶ utils/, context/AppContext（CourseDetailModal）
hooks/ ─▶ context/AppContext, services/aiApi, utils/, config/, data/, lib/firebase, firebase/*（useUserDataSync）
context/AppContext ─▶ hooks/useUserDataSync, lib/firebase, firebase/auth（ログイン）
services/aiApi ─▶ lib/firebase（ID トークン）─▶ /api/*
```

- `firebase/*` を import しているのは `lib/`・`hooks/useUserDataSync.ts`・`context/AppContext.tsx` だけ。画面・コンポーネントは `firebase/*` と `services/` を直接 import しない（この形を保つ）
- `api/` は `src/` のコードを import しない。データが必要なら `src/data/*.json` を `fs` で読む

### 画面に残っている計算（この移行では hook に出していない）

| 画面 | 残っている処理 |
|------|----------------|
| `DashboardScreen.tsx` | GPA シミュレーター（`MOCK_COURSES` で単位数を数え、`isPassingGradePoint` で修得単位を出す）、プロフィールの編集（入力中の値・`validateStudentPeriod`・保存）、新学期の確認 |
| `GradeInputScreen.tsx` | 成績入力の一覧（`selectedCourses` か `committedClasses` から作る）、成績の保存、新学期の確認 |
| `OnboardingScreen.tsx` | 入力中の値と入学・卒業予定年月の確かめ（`validateStudentPeriod`） |
| `CourseSelectionScreen.tsx` | 表示用のラベル・色（`getTargetGrades`・`getPeriodLabel`・`getSubjectColor`）、不合格の印（`isCourseFailed`） |
| `ConditionScreen.tsx`・`ReflectionScreen.tsx`・`LoginScreen.tsx` | 入力中の値と画面の切り替えだけ |

- これらは別の spec で hook に出すかを決める。出すときも、見た目と動きは `npm run check:ui` で変わらないことを確かめる

## 命名とコードの書き方（既存コードの慣習）

- コンポーネント：PascalCase の名前付き export、`React.FC` で型付け（例：`export const DashboardScreen: React.FC = () => ...`）。`App` だけ default export
- 画面ファイルは `<名前>Screen.tsx`
- 型 import は `import type`（`verbatimModuleSyntax` が有効）
- マスターデータのキーは snake_case（`id_name`, `target_bit`, `class_id`）、アプリ側の状態は camelCase（`courseId`, `targetBit`, `classId`）
- 科目の識別子は `id_name`（"HS01 哲学" のような「コード 名前」）。表示名も兼ねている
- スタイルは Tailwind のユーティリティクラスを直接書く。色は `tailwind.config.js` のトークン（`background` / `foreground` / `card` / `accent` / `border` / `muted`）を使う。共通ボタンは `btn-primary` / `btn-secondary` / `btn-ghost`
- UI の文言・コメントは日本語
- インデントは 4 スペースが多いが、2 スペースのファイルもある（`App.tsx`、`GradeInputScreen.tsx`、`components/Header.tsx`・`components/Button.tsx`）。編集するファイルの書き方に合わせる

## データファイルの扱い

- `reviews_bit.json`・`reviews_text.json`・`course_list_for_prompt.md` は生成物。直接編集せず、`raw_reviews.json` を直して `npm run build:reviews`
- `syllabus.json`（204科目）は手で管理されている。形の崩れていた `OT03-001` の `classes` は 2026-10-12 に直したが、読む側は引き続き `schedule` がない可能性を考える（`?? []`）
