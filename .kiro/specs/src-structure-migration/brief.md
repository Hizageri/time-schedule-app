# Brief: src-structure-migration

> 2026-10-22 注：この brief は予選（10/31）に向けて書いたもの。予選の前提（審査員・日程）は古い。着手するときに `roadmap.md`（2026-10-22 版）に合わせて見直す。もとの `core-bug-fixes` は `secure-and-stable` に統合した

## Problem

`src/` の構成が `structure.md` の「目標の構成（2026-10-13 決定）」と合っていない。そのため、次の問題が起きている。

- 画面ファイルに計算・通信・ビットの判定が直接書かれている
  - 例：`DashboardScreen.tsx`（559行）、`GeneratorScreen.tsx`（497行）、`CourseSelectionScreen.tsx` の絞り込み
- 同じロジックが複数の場所に重複している
  - 学期とクォーターのビット判定：4〜5か所
  - コマ表のセル探しと表のマークアップ：Generator と Dashboard
  - 合格の判定：4か所
- このままだと、後続の spec（不具合修正・空きコマ検索・UI）で、同じ修正を何か所にも入れることになり、漏れも起きやすい

## Current State

- 構成：`logic/`（AppContext・types・utils・timetableGenerator）、`ai/aiService.ts`、`ui/`（Header・Button・styles）、`components/App.tsx`、`data.ts`
- `structure.md` の「現状からの対応」の表に、どのファイルをどこへ移すかが決まっている
- lint エラーは約50件。ただし `node_modules` がなく、件数はまだ確認していない。設定から予想すると、主なものは次のとおり
  - `no-explicit-any`：`api/` に多く、`src/` にも約8か所
  - `react-refresh/only-export-components`：`CourseDetailModal.tsx`、`AppContext.tsx`
  - `no-unused-vars`、`prefer-const`、`react-hooks/exhaustive-deps`
- テストはない

## Desired Outcome

- `src/` が目標の構成になり、各フォルダのルールと依存の向き（`structure.md`）を守っている
  - `pages/`・`components/` は見た目だけを持つ
  - 計算は `utils/`、通信は `services/`、画面の裏側の処理は `hooks/`（1ファイル1フック、`use` で始まる）
- 重複していた計算は `utils/` の1か所にある
- Firestore との同期は `context/` から `hooks/` に分かれている
- `npm run build` がエラーなしで通る（余裕があれば部分まで終えたら `npm run lint` もエラーなしで通る）
- **画面の見た目と動きは、移行前と完全に同じ**（既知の不具合も含めて変えない）
- `structure.md` の「現状の構成」と「依存の向き（現状）」が、移行後の内容に更新されている

## Approach

案B「移行をやり切る」（`roadmap.md` 参照）。

1. 型・計算・通信・状態（`types/`・`utils/`・`services/`・`context/`・`lib/`・`data/`）を移す
2. 画面に重複している計算を `utils/` にまとめる
3. 各画面の計算・通信を `hooks/` に出す
4. UI 部品（`components/`・`assets/`・`App.tsx`）を移す

1ステップごとに `npm run build` と手での画面確認を行い、動きが変わっていないことを確かめる。

## Scope

範囲を「必須」と「余裕があれば」に分ける（`roadmap.md`）。必須を終えたら後続の spec に進み、余裕があれば部分は日程に余裕があるときだけ行う。遅れたときは、まず余裕があれば部分から削る。

- **In（必須）**:
  - `structure.md` の「現状からの対応」の表にある移動のすべて
  - 後続の spec が使う部品の切り出し：
    - `services/aiApi.ts`
    - `utils/`：学期・クォーターの判定、セル探し、受講できる科目の絞り込み、合格の判定、重なり判定
    - `hooks/`：Firestore 同期、受講できる科目（画面3）、時間割パターンと生成プレビュー（画面5）
  - 重複しているロジックを `utils/` にまとめる。**現在の動きを1つも変えない形で**まとめる。挙動が違うもの（例：合格の判定が4種類）は、違いを残したまま置き場所だけまとめるか、まとめずに置く。挙動をそろえるのは `core-bug-fixes` で行う
  - `AppContext` の Firestore 同期を `hooks/` に分ける（同期の動き自体は変えない）
  - `defaultState` を `context/` へ、型を `types/` へ移す
  - 移行後に `structure.md` を更新する
- **In（余裕があれば）**:
  - 必須以外の画面の整理：後続の spec が使わないロジックを、画面から `hooks/` に出す（例：ダッシュボードの GPA シミュレーター、成績入力、プロフィール）
  - lint エラーをゼロにする（`src/` と `api/`）
    - `any` は型に置き換える
    - `react-refresh` の指摘は、ファイルを分けて解消する
- **Out**:
  - 不具合の修正。移行中に見つけても直さず、`core-bug-fixes` に回す
    - 5限より後が表示されない（`maxPeriods` の初期値 5）
    - ピンを AI に送っていない
    - Firestore の読み込み前の書き込み、`merge: true` で消したキーが戻る
    - `removeCommittedClass` の部分一致で別の科目まで消える
    - `checkScheduleConflict` の演算子の優先順位の誤り
    - 合格の判定のばらつき
  - 見た目・文言・画面の流れの変更
  - 未使用のコードの削除（`product.md`「現状の位置づけ」に従い、移すだけで消さない）
  - デバッグ用の `console.log` を消すかどうか（動きに関わらないので、移行の design で扱いを決める）
  - データの形（`data-model.md`）の変更

## Boundary Candidates

- 型と初期値（`types/`、`context/` の `defaultState`）
- 計算（`utils/`）：ビット判定、学期・クォーターの判定、セル探し、受講できる科目の絞り込み、GPA の計算、`cn()`、色
- 通信（`services/aiApi.ts`）
- 状態と同期（`context/AppContext.tsx` と、`hooks/` の Firestore 同期フック）
- 画面ごとの hook（例：`useAvailableCourses`、`useTimetablePatterns`、`useTimetableGrid`）
- UI 部品と静的素材（`components/`・`assets/`・`App.tsx`）

## Out of Boundary

- 動きの変化を伴う修正はすべて `core-bug-fixes` が持つ
- 見た目の変更は `first-run-ux-refresh` が持つ
- ルートの `api/` の構成は変えない（余裕があれば部分で、lint のための型付けだけ行う）

## Upstream / Downstream

- **Upstream**: `structure.md`（目標の構成・各フォルダのルール・依存の向き・現状からの対応）、`data-model.md`（型の正）
- **Downstream**: `core-bug-fixes`、`empty-slot-search`、`first-run-ux-refresh`。この3つは、ここで作る `utils/`・`hooks/`・`services/` の部品を使う

## Existing Spec Touchpoints

- **Extends**: なし
- **Adjacent**: `core-bug-fixes`。同じファイル（AppContext・Generator・aiService）を触るので、この spec では動きを変えないことを徹底する

## Constraints

- 画面の見た目と動きを一切変えない。テストがないので、`roadmap.md` の「確認の方法」に決めた段階で、`npm run build` と手による確認（共通の確認 1〜6）を行う
- コンポーネントから `firebase/*` を直接 import しない
- 新しいコードで `any` を使わない
- 予定：必須は 10/14〜10/17、余裕があれば部分は 10/18〜10/19（余裕があるときだけ）。遅れたら、まず余裕があれば部分を削り、UI の時間を守る
- 移行の spec が終わるまでは、ほかの作業でファイルを移さない（`structure.md`）
