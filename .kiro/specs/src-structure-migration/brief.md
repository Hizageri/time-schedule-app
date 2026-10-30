# Brief: src-structure-migration

> 2026-10-30 見直し：予選（10/31）向けに書いた版を、`secure-and-stable`・`student-period` が終わった今のコードと `roadmap.md` に合わせて書き直した。第2段階なので期限はない

## Problem

`src/` の構成が `structure.md` の「目標の構成（2026-10-13 決定）」と合っていない。そのため、次の問題が起きている。

- 画面ファイルに計算・状態の操作が直接書かれていて、ファイルが大きい
  - `DashboardScreen.tsx`（663行）、`GeneratorScreen.tsx`（479行）、`AppContext.tsx`（347行。読み込みの状態・3秒まとめた保存などを含む）
- 同じ計算が複数の場所に重複している
  - 学期・クォーターのビット判定（`(bit >> 8) & 3`・`(bit >> 6) & 3`）：`timetableGenerator.ts`・`GeneratorScreen`・`DashboardScreen`・`CourseSelectionScreen` に計9か所
  - コマ表のセル探し（その曜日・時限に入る授業を探す）：`GeneratorScreen` と `DashboardScreen` に1つずつ
- 後続の spec（`university-data-model`・`ui-design-definition`・`empty-slot-search`・`first-run-ux-refresh`）は、この計算と画面5・ダッシュボードを触る。今のままだと、同じ修正を何か所にも入れることになり、漏れが起きやすい
  - 特に `university-data-model` は「学期制・時限の数を大学ごとの設定にする」ので、ビット判定が散らばっていると直す場所が多い

## Current State

- 構成：`logic/`（`AppContext`・`types`・`utils`・`timetableGenerator`・`universityConfig`・`inputLimits`）、`ai/aiService.ts`、`lib/firebase.ts`、`ui/`（`Header`・`Button`・`styles/`）、`components/`（`App`・`CourseDetailModal`・`MobileTimetableList`・`LoadingSenpai`・`ErrorBoundary`）、`pages/`（8画面）、`data.ts`
- `structure.md` の「現状からの対応」の表に、どのファイルをどこへ移すかが決まっている。ただし、表を作った後に増えたファイル（`logic/universityConfig.ts`・`logic/inputLimits.ts`）の移行先が決まっていない
- 第1段階で入った大事な動き（移行で変えてはいけないもの）
  - 保存：読み込みの状態（`loadStatus`）、読み込みが終わるまで保存しない、3秒まとめて `merge` なしで保存、ページを隠す・閉じる・ログアウト・利用者の切り替えの前の保存
  - AI の呼び出し：ID トークンを付ける、401 ならログアウト、送るプロフィールの項目を絞る
  - ピンを守るクラスの決め方（`resolveClassAssignments`）、合否の判定（`isCoursePassed` など。すでに1か所にまとまっている）
  - ログイン：アカウントの選択画面を出す、ポップアップを閉じても失敗にしない
- lint の指摘は 35 件（2026-10-30）
  - `no-explicit-any` 23 件（うち `api/chatbot.ts` が 10 件）、`react-refresh/only-export-components` 5 件、`no-unused-vars` 4 件、`prefer-const`・`exhaustive-deps`・`set-state-in-effect` 各1件
- テストの仕組みはない。第1段階では、Firebase を偽物に差し替えて本物の画面を動かす使い捨ての「試しの画面」（Vite＋Playwright）で確かめた。ただし試しの画面は作業環境の一時フォルダにあり、リポジトリには入っていない

## Desired Outcome

- `src/` が目標の構成になり、各フォルダのルールと依存の向き（`structure.md`）を守っている
  - `pages/`・`components/` は見た目だけを持つ
  - 計算は `utils/`、通信は `services/`、画面の裏側の処理は `hooks/`（1ファイル1フック、`use` で始まる）
- 重複していた計算（学期・クォーターの判定、セル探し）が `utils/` の1か所にある
- Firestore との同期（読み込み・保存）が `context/` から `hooks/` に分かれている
- `npm run build` がエラーなしで通る
- **画面の見た目と動きは、移行前と完全に同じ**（第1段階・`student-period` で直した動きも含めて変えない）
- `structure.md` の「現状の構成」「現状からの対応」「依存の向き（現状）」が移行後の内容に更新され、`tech.md` などのファイルの場所の記述も新しい場所に合っている

## Approach

`roadmap.md` の確認の段階に合わせて、3段階で移す。各段階の後に `npm run build` と、共通の確認 1〜6 を行う。

1. 型・計算・通信・状態を移す（`types/`・`utils/`・`services/`・`context/`・`data/`）
2. 重複している計算を `utils/` にまとめ、画面の計算・状態の操作を `hooks/` に出す。Firestore 同期を `hooks/` に分ける
3. UI 部品と静的素材を移す（`components/`・`assets/`・`App.tsx`）

## Scope

- **In（必須）**:
  - `structure.md` の「現状からの対応」の表にある移動のすべて
  - 表にない `logic/universityConfig.ts`・`logic/inputLimits.ts` の移行先を決めて移す（決めたら `structure.md` の表に足す）
  - 後続の spec が使う部品の切り出し
    - `services/aiApi.ts`
    - `utils/`：学期・クォーターの判定、セル探し、受講できる科目の絞り込み、合否の判定、ピンを守るクラスの決め方、いちばん遅い時限、年月の確かめ
    - `hooks/`：Firestore 同期、受講できる科目（画面3）、時間割パターンと生成プレビュー（画面5）、ダッシュボードの時間割
  - 重複している計算を `utils/` にまとめる。**今の動きを1つも変えない形で**まとめる
  - `defaultState` を `context/` へ、型を `types/` へ移す
  - `structure.md` と、ファイルの場所を書いているほかの steering（`tech.md`・`data-model.md` など）を更新する
- **In（余裕があれば）**:
  - 後続の spec が使わない画面の整理（例：ダッシュボードの GPA シミュレーター・プロフィール、成績入力）を `hooks/` に出す
  - lint の指摘をゼロにする（`src/` と `api/`）。`any` は型に置き換え、`react-refresh` の指摘はファイルを分けて解消する
- **Out**:
  - 不具合の修正・動きの変更。移行中に見つけても直さず、記録して別に扱う（例：使われていない `checkScheduleConflict` の演算子の優先順位の誤り）
  - 見た目・文言・画面の流れの変更
  - 未使用のコードの削除（`product.md`「現状の位置づけ」に従い、移すだけで消さない）
  - データの形（`data-model.md` の型の中身）の変更
  - ルートの `api/` の構成の変更

## Boundary Candidates

- 型と初期値（`types/`、`context/` の `defaultState`）
- 計算（`utils/`）：ビット判定、学期・クォーターの判定、セル探し、受講できる科目の絞り込み、合否、ピン、時限、年月、GPA、`cn()`、色
- 通信（`services/aiApi.ts`）
- 状態と同期（`context/AppContext.tsx` と、`hooks/` の Firestore 同期フック）
- 画面ごとの hook（例：`useAvailableCourses`、`useTimetablePatterns`、`useTimetableGrid`）
- UI 部品と静的素材（`components/`・`assets/`・`App.tsx`）

## Out of Boundary

- 動きの変化を伴う修正は、その内容に合う spec か、個別の不具合修正で行う
- 大学ごとの設定の形は `university-data-model` が持つ（この spec では `universityConfig.ts` を移すだけ）
- 見た目の決まりは `ui-design-definition`、画面の作り直しは `first-run-ux-refresh` が持つ

## Upstream / Downstream

- **Upstream**: `structure.md`（目標の構成・各フォルダのルール・依存の向き・現状からの対応）、`data-model.md`（型の正）、`secure-and-stable`・`student-period`（移行で変えてはいけない動き）
- **Downstream**: `university-data-model`、`ui-design-definition`、`empty-slot-search`、`first-run-ux-refresh`。ここで作る `utils/`・`hooks/`・`services/` の部品を使う

## Existing Spec Touchpoints

- **Extends**: なし
- **Adjacent**: `secure-and-stable`（完了）。同期・AI の呼び出し・ピン・合否のコードを移すので、第1段階の確認項目（保存・ピン・最大時限・科目の上限）が移行後も通ることを確かめる

## Constraints

- 画面の見た目と動きを一切変えない。テストの仕組みがないので、各段階で `npm run build` と、試しの画面での確認と、手による確認（共通の確認 1〜6）を行う
- コンポーネント・画面から `firebase/*` を直接 import しない。`firebase/*` を import してよいのは `lib/`・`hooks/`・`context/` だけ
- 新しいコードで `any` を使わない
- 移行の spec が終わるまでは、ほかの作業でファイルを移さない（`structure.md`）
- 期限はない（第2段階）。余裕があれば部分は、必須が終わってから行うかを決める

## Open Questions（要件で決める）

- `logic/universityConfig.ts`（今の大学の設定）・`logic/inputLimits.ts`（入力の上限）の移行先。目標の構成に「設定」のフォルダはない。候補：`utils/` に置く／`config/` を足す（`structure.md` の目標の構成を変えることになる）
- 試しの画面（移行前と同じ動きかを確かめる道具）をリポジトリに入れるか。入れると確認をくり返しやすいが、テストの仕組みを足すことになる（今は「テストなし」の方針）
- 余裕があれば部分（lint ゼロ・ほかの画面の整理）を、この spec で行うか、後に回すか
