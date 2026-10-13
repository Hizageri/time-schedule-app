# Requirements Document

## Project Description (Input)

**誰が困っているか**：このアプリを一人（＋Claude）で開発・保守している開発者。予選（2026-10-31）に向けて、このあと不具合修正（`core-bug-fixes`）・空きコマ検索（`empty-slot-search`）・UI 見直し（`first-run-ux-refresh`）を順に進める。

**現状**：`src/` の構成が `structure.md` の「目標の構成（2026-10-13 決定）」と合っていない。
- 画面ファイルに、計算・通信・ビット判定が直接書かれている（例：`DashboardScreen.tsx` 559行、`GeneratorScreen.tsx` 497行、`CourseSelectionScreen.tsx` の絞り込み）
- 同じロジックが複数の場所に重複している（学期・クォーターの判定が4〜5か所、コマ表のセル探しと表のマークアップが Generator と Dashboard、合格の判定が4か所）
- このままだと、後続の spec で同じ修正を何か所にも入れることになり、漏れも起きやすい。テストはなく、lint エラーは約50件（未確認）ある

**何を変えるか**：画面の見た目と動きを一切変えずに（既知の不具合も含めて）、`src/` を目標の構成へ移す。範囲は「必須」と「余裕があれば」に分ける（`.kiro/steering/roadmap.md`）。
- **必須**（10/14〜10/17）
  - `structure.md` の「現状からの対応」の表にある移動をすべて行う
  - 後続の spec が使う部品を切り出す
    - `services/aiApi.ts`
    - `utils/`：学期・クォーターの判定、セル探し、受講できる科目の絞り込み、合格の判定、重なり判定。挙動の違うものは違いを残したまま置く
    - `hooks/`：Firestore 同期（動きは変えない）、画面3の受講できる科目、画面5の時間割パターンと生成プレビュー
  - 移行後に `structure.md` を更新する
- **余裕があれば**（10/18〜10/19。遅れたら最初に削る）
  - 上記以外の画面のロジックを `hooks/` に出す
  - lint エラーをゼロにする（`src/` と `api/`）
- **範囲外**
  - 不具合の修正（`core-bug-fixes` で行う）
  - 見た目・文言・画面の流れの変更
  - 未使用コードの削除
  - データの形（`data-model.md`）の変更
- **確認**：テストがないため、`roadmap.md` の「確認の方法」に決めた段階で、`npm run build` と手による確認（共通の確認 1〜6）を行う

詳細は `brief.md` を参照。

## Requirements
<!-- Will be generated in /kiro-spec-requirements phase -->
